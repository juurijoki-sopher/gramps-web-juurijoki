"""Password reset ("Lost password?") in Finnish or English.

Gramps Web API's own reset sends an English message with a link to an
English page of the API. POST /api/juurijoki/password-reset/<user_name>/
does the same reset, with the API's own one-time token valid for an hour,
but writes the message in Finnish or English and links to the frontend's
/set-password page, which uses the same language.

The language is the "lang" of the request body, which the frontend takes
from the browser, or else the request's Accept-Language: Finnish for
Finnish, English for any other language.

As in the API, the answer is the same whether the user exists or not, so
that it does not tell which user names exist.
"""

import datetime

from flask import Flask, current_app, request
from flask_jwt_extended import create_access_token
from gramps_webapi.api.ratelimiter import limiter
from gramps_webapi.api.util import abort_with_message, get_config, send_email
from gramps_webapi.auth import get_guid, get_pwhash, get_user_details
from gramps_webapi.auth.const import CLAIM_LIMITED_SCOPE, SCOPE_RESET_PW
from gramps_webapi.auth.oidc_helpers import is_local_auth_disabled

RESET_PATH = "/api/juurijoki/password-reset/"
VALID_FOR = datetime.timedelta(hours=1)

MESSAGES = {
    "fi": {
        "subject": "Salasanan vaihto",
        "body": (
            "Hei {name},\n\n"
            "joku, toivottavasti sinä, pyysi uutta salasanaa "
            "käyttäjätunnukselle {user_name}.\n\n"
            "Aseta uusi salasana tästä linkistä:\n"
            "{url}\n\n"
            "Linkki on voimassa tunnin ja toimii vain kerran.\n\n"
            "Jos et pyytänyt uutta salasanaa, voit jättää tämän viestin "
            "huomiotta. Nykyinen salasanasi pysyy voimassa.\n"
        ),
    },
    "en": {
        "subject": "Reset your password",
        "body": (
            "Hello {name},\n\n"
            "someone, hopefully you, asked for a new password for the user "
            "name {user_name}.\n\n"
            "Set a new password with this link:\n"
            "{url}\n\n"
            "The link is valid for an hour and works only once.\n\n"
            "If you did not ask for a new password, you can ignore this "
            "message. Your current password stays valid.\n"
        ),
    },
}


def reset_language(body_lang, accept_languages):
    """'fi' for Finnish, 'en' for any other language."""
    if not body_lang and accept_languages:
        # the browser's first language, as the frontend takes it
        body_lang = next(iter(accept_languages.values()), "")
    return "fi" if str(body_lang or "").lower().startswith("fi") else "en"


def reset_message(lang, name, user_name, url):
    """The subject and body of the message, in the language."""
    texts = MESSAGES.get(lang, MESSAGES["en"])
    body = texts["body"].format(name=name, user_name=user_name, url=url)
    return texts["subject"], body


@limiter.limit("1/second")
def _reset(user_name):
    if is_local_auth_disabled():
        abort_with_message(405, "Local authentication is disabled")
    body = request.get_json(silent=True) or {}
    lang = reset_language(body.get("lang"), request.accept_languages)
    details = get_user_details(user_name) if user_name != "-" else None
    email = (details or {}).get("email")
    if not email:
        return "", 201
    user_id = str(get_guid(name=user_name))
    token = create_access_token(
        identity=user_id,
        # the hash of the current password makes the token work only once
        additional_claims={
            "old_hash": get_pwhash(user_name),
            CLAIM_LIMITED_SCOPE: SCOPE_RESET_PW,
        },
        expires_delta=VALID_FOR,
    )
    base_url = (get_config("BASE_URL") or "").rstrip("/")
    url = f"{base_url}/set-password?token={token}&reason=reset"
    name = details.get("full_name") or user_name
    subject, text = reset_message(lang, name, user_name, url)
    try:
        send_email(subject=subject, body=text, to=[email])
    except ValueError as exc:
        current_app.logger.error("Password reset e-mail failed: %s", exc)
        abort_with_message(500, "Error while trying to send e-mail")
    return "", 201


def init_app(app: Flask) -> None:
    app.add_url_rule(
        RESET_PATH + "<string:user_name>/",
        "juurijoki_password_reset",
        _reset,
        methods=["POST"],
    )
