# Railway deployment: builds this fork's frontend and bundles it with the
# Gramps Web API backend in a single container. The Celery worker runs in the
# same container because Railway volumes cannot be shared between services
# and both processes need the same SQLite databases and media files.

FROM node:22-bookworm-slim AS frontend
WORKDIR /src
COPY package.json package-lock.json ./
# --ignore-scripts: skip husky git hooks (no .git in the build context)
RUN npm ci --ignore-scripts --no-audit --no-fund
COPY . .
RUN npm run build

FROM dmstraub/gramps-webapi:v3.26.0

# Keep all persistent state under the single Railway volume mounted at /data
ENV GRAMPSHOME=/data/home \
    GRAMPS_DATABASE_PATH=/data/grampsdb \
    GRAMPSWEB_USER_DB_URI=sqlite:////data/users/users.sqlite \
    GRAMPSWEB_MEDIA_BASE_DIR=/data/media \
    GRAMPSWEB_SEARCH_INDEX_DB_URI=sqlite:////data/indexdir/search_index.db \
    GRAMPSWEB_THUMBNAIL_CACHE_CONFIG__CACHE_DIR=/data/thumbnail_cache \
    GRAMPSWEB_REQUEST_CACHE_CONFIG__CACHE_DIR=/data/cache/request_cache \
    GRAMPSWEB_PERSISTENT_CACHE_CONFIG__CACHE_DIR=/data/cache/persistent_cache \
    GRAMPSWEB_REPORT_DIR=/data/cache/reports \
    GRAMPSWEB_EXPORT_DIR=/data/cache/export \
    GUNICORN_NUM_WORKERS=2 \
    CELERY_CONCURRENCY=2

COPY --from=frontend /src/dist /app/static

# Gramps addon FilterRules: its DegreesOfSeparation rule is what the
# relationship chart asks the API for, and Gramps Web API does not ship it
# (its devcontainer installs it the same way). The archive is the gramps60
# build from github.com/gramps-project/addons, kept in this repository so the
# build does not change with the addons' master branch. start.sh copies it to
# the user plugins folder, which is on the volume.
COPY railway/addons/FilterRules.addon.tgz /tmp/FilterRules.addon.tgz
RUN mkdir -p /opt/gramps-addons \
    && tar -xzf /tmp/FilterRules.addon.tgz -C /opt/gramps-addons \
    && rm /tmp/FilterRules.addon.tgz
# Juurijoki additions, wrapped around the API app without changing it: user
# accounts are linked to people in the tree (see juurijoki/userlinks.py)
COPY railway/juurijoki /opt/juurijoki/juurijoki
COPY railway/start.sh /railway-start.sh
RUN chmod +x /railway-start.sh

ENTRYPOINT ["/railway-start.sh"]
