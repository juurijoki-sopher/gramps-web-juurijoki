#!/bin/sh
# Start script for the Railway container: gunicorn (web/API) and the Celery
# worker side by side. If either process exits, the container exits so that
# Railway's restart policy brings both back up.
set -e

if [ ! -d /data ]; then
    echo "ERROR: /data is missing. Attach a Railway volume at /data." >&2
    exit 1
fi

mkdir -p /data/home /data/grampsdb /data/users /data/media /data/indexdir \
    /data/thumbnail_cache /data/cache/request_cache \
    /data/cache/persistent_cache /data/cache/reports /data/cache/export

# Without an explicit key, generate one once and keep it on the volume so
# that logins survive redeploys (upstream stores it in non-persistent /app)
if [ -z "$GRAMPSWEB_SECRET_KEY" ]; then
    if [ ! -s /data/secret/secret_key ]; then
        mkdir -p /data/secret
        chmod 700 /data/secret
        python3 -c "import secrets;print(secrets.token_urlsafe(48))" \
            | tr -d "\n" > /data/secret/secret_key
        chmod 600 /data/secret/secret_key
    fi
    GRAMPSWEB_SECRET_KEY=$(cat /data/secret/secret_key)
    export GRAMPSWEB_SECRET_KEY
fi

# The upstream entrypoint runs the user database migrations, then execs us
# back with the "run" argument.
if [ "$1" != "run" ]; then
    exec /docker-entrypoint.sh /railway-start.sh run
fi

celery -A gramps_webapi.celery worker --loglevel=INFO \
    --concurrency="${CELERY_CONCURRENCY:-2}" &
CELERY_PID=$!

gunicorn -w "${GUNICORN_NUM_WORKERS:-2}" -b "0.0.0.0:${PORT:-5000}" \
    gramps_webapi.wsgi:app --timeout "${GUNICORN_TIMEOUT:-120}" \
    --limit-request-line 8190 --preload &
GUNICORN_PID=$!

trap 'kill -TERM $GUNICORN_PID $CELERY_PID 2>/dev/null' TERM INT

# POSIX sh has no "wait -n": poll until one of the processes is gone
while kill -0 $GUNICORN_PID 2>/dev/null && kill -0 $CELERY_PID 2>/dev/null; do
    sleep 5
done

echo "A process exited; stopping the container." >&2
kill -TERM $GUNICORN_PID $CELERY_PID 2>/dev/null || true
wait
exit 1
