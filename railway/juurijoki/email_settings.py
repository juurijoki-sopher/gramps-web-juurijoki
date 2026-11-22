"""E-mail (SMTP) settings for administrators.

Gramps Web API already keeps the SMTP settings in its user database
(EMAIL_HOST, EMAIL_PORT, EMAIL_HOST_USER, EMAIL_HOST_PASSWORD and
DEFAULT_FROM_EMAIL, see DB_CONFIG_ALLOWED_KEYS), where they take precedence
over the environment. Its /api/config/ endpoint, however, hands the stored
password back to the browser. These endpoints read and write the same
settings without ever returning the password:

- GET  /api/juurijoki/email-settings/       the settings, and whether a
                                            password is set
- PUT  /api/juurijoki/email-settings/       save them; a password is only
                                            changed when one is sent
- POST /api/juurijoki/email-settings/test/  send a test message to the
                                            administrator's own address

The API picks the encryption from EMAIL_USE_SSL, EMAIL_USE_STARTTLS and
EMAIL_USE_TLS, and as EMAIL_USE_TLS is on by default it uses SSL on every
port, which fails on the usual STARTTLS port 587. Unless SSL or STARTTLS is
set explicitly, the encryption follows the port here: SSL on 465, none on 25
and STARTTLS otherwise.
"""

from flask import Flask, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from gramps_webapi.api import util as api_util
from gramps_webapi.api.auth import has_permissions
from gramps_webapi.api.util import abort_with_message, get_config, send_email
from gramps_webapi.auth import (
    config_delete,
    config_get,
    config_set,
    get_name,
    get_user_details,
)
from gramps_webapi.auth.const import PERM_EDIT_SETTINGS, PERM_VIEW_SETTINGS

SETTINGS_PATH = "/api/juurijoki/email-settings/"

# the fields of this page, by the API's config keys
FIELDS = {
    "host": "EMAIL_HOST",
    "port": "EMAIL_PORT",
    "user": "EMAIL_HOST_USER",
    "from_email": "DEFAULT_FROM_EMAIL",
}
PASSWORD_KEY = "EMAIL_HOST_PASSWORD"

_original_resolve = api_util._resolve_smtp_config  # pylint: disable=protected-access


def resolve_smtp_config(use_ssl, use_starttls, use_tls, port):
    """(use_ssl, use_starttls) for a port, unless set explicitly."""
    if use_ssl is not None or use_starttls is not None:
        return _original_resolve(use_ssl, use_starttls, use_tls, port)
    if int(port) == 465:
        return True, False
    if int(port) == 25:
        return False, False
    return False, True


def install_smtp_fix():
    """Make the API's send_email pick the encryption from the port.

    Called in both the web and the Celery worker processes.
    """
    api_util._resolve_smtp_config = resolve_smtp_config  # pylint: disable=protected-access


def _require(permission):
    verify_jwt_in_request()
    if not has_permissions({permission}):
        abort_with_message(403, "Forbidden")


def _current():
    data = {field: get_config(key) or "" for field, key in FIELDS.items()}
    if data["host"] == "localhost" and config_get(FIELDS["host"]) is None:
        data["host"] = ""  # the API's default, not a setting
    data["port"] = str(data["port"] or "")
    data["password_set"] = bool(get_config(PASSWORD_KEY))
    # what the user database holds, as opposed to the environment
    data["stored"] = config_get(FIELDS["host"]) is not None
    return data


def _get():
    _require(PERM_VIEW_SETTINGS)
    return jsonify(_current())


def _put():
    _require(PERM_EDIT_SETTINGS)
    body = request.get_json(silent=True) or {}
    values = {field: str(body.get(field, "") or "").strip() for field in FIELDS}
    if values["port"]:
        if not values["port"].isdigit() or not 0 < int(values["port"]) < 65536:
            abort_with_message(422, "The port must be a number from 1 to 65535.")
    if values["from_email"] and "@" not in values["from_email"]:
        abort_with_message(422, "The sender address is not an e-mail address.")
    if values["host"] and not (values["port"] and values["from_email"]):
        abort_with_message(
            422, "Give the port and the sender address with the server."
        )
    for field, key in FIELDS.items():
        if values[field]:
            config_set(key=key, value=values[field])
        elif config_get(key) is not None:
            config_delete(key=key)
    password = body.get("password")
    if body.get("clear_password") or not values["host"]:
        if config_get(PASSWORD_KEY) is not None:
            config_delete(key=PASSWORD_KEY)
    elif password:
        config_set(key=PASSWORD_KEY, value=str(password))
    return jsonify(_current())


def _test():
    _require(PERM_EDIT_SETTINGS)
    if not get_config("EMAIL_HOST") or get_config("EMAIL_HOST") == "localhost":
        abort_with_message(422, "No e-mail server has been set.")
    user_name = get_name(get_jwt_identity())
    email = (get_user_details(user_name) or {}).get("email")
    if not email:
        abort_with_message(422, "Your account has no e-mail address.")
    try:
        send_email(
            subject="Gramps Web: testiviesti",
            body=(
                "Tämä on testiviesti Gramps Webin sähköpostiasetuksista.\n\n"
                "Jos sait tämän viestin, kutsulinkit ja salasanan "
                "palautusviestit lähtevät käyttäjille sähköpostilla.\n"
            ),
            to=[email],
        )
    except ValueError as exc:
        abort_with_message(502, f"The test message could not be sent: {exc}")
    return jsonify({"sent_to": email})


def init_app(app: Flask) -> None:
    install_smtp_fix()
    app.add_url_rule(SETTINGS_PATH, "juurijoki_email_settings", _get)
    app.add_url_rule(
        SETTINGS_PATH, "juurijoki_email_settings_put", _put, methods=["PUT"]
    )
    app.add_url_rule(
        SETTINGS_PATH + "test/",
        "juurijoki_email_settings_test",
        _test,
        methods=["POST"],
    )
