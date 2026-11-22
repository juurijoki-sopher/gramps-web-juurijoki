"""Invitations: new users set their own password.

Whoever adds a user does not give them a password. The account is created
with a random password nobody sees, and the user gets a link to set their
own: POST /api/juurijoki/invites/<user_name>/ returns the link, and sends it
by e-mail as well when the server has an e-mail account configured.

The link carries the API's own password reset token, valid for 7 days
instead of the hour of a "forgot password" link. Like that one, it works
only once: the token holds the hash of the current password, so setting a
password ends it. The page it opens is the frontend's /set-password.

A link lets its holder set the password, so only someone with a higher role
than the user may create one, as for setting another user's password in
Gramps Web API.
"""

import datetime

from flask import Flask, current_app, jsonify, request
from flask_jwt_extended import create_access_token, verify_jwt_in_request
from gramps_webapi.api.auth import has_permissions
from gramps_webapi.api.resources.user import abort_unless_lower_role
from gramps_webapi.api.util import (
    abort_with_message,
    get_config,
    get_tree_from_jwt,
    send_email,
)
from gramps_webapi.auth import get_guid, get_pwhash, get_tree, get_user_details
from gramps_webapi.auth.const import (
    CLAIM_LIMITED_SCOPE,
    PERM_ADD_OTHER_TREE_USER,
    PERM_EDIT_OTHER_USER,
    SCOPE_RESET_PW,
)

from .userlinks import MSG_LINK_FIRST, get_link

INVITES_PATH = "/api/juurijoki/invites/"
VALID_FOR = datetime.timedelta(days=7)

MSG_NO_EMAIL = "The user has no e-mail address."


def email_configured():
    """Whether the server has an e-mail account to send from.

    The settings come from the user database, as set in the frontend's
    administration settings, or else from the environment.
    """
    return bool(get_config("DEFAULT_FROM_EMAIL")) and get_config(
        "EMAIL_HOST"
    ) not in (None, "", "localhost")


def invite_url(token):
    base_url = (get_config("BASE_URL") or "").rstrip("/")
    return f"{base_url}/set-password?jwt={token}"


def _email_body(full_name, user_name, url):
    greeting = f"Hei {full_name}," if full_name else "Hei,"
    return (
        f"{greeting}\n\n"
        "sinulle on luotu käyttäjätunnus sukupuuhun.\n\n"
        f"Käyttäjätunnus: {user_name}\n\n"
        "Aseta oma salasanasi tästä linkistä:\n"
        f"{url}\n\n"
        "Linkki on voimassa 7 vuorokautta ja toimii vain kerran. "
        "Jos se ehtii vanhentua, pyydä uusi linkki ylläpitäjältä.\n"
    )


def _create_invite(user_name):
    verify_jwt_in_request()
    if not has_permissions({PERM_EDIT_OTHER_USER}):
        abort_with_message(403, "Forbidden")
    try:
        user_id = str(get_guid(user_name))
    except ValueError:
        abort_with_message(404, "User not found")
    if get_tree(user_id) not in (get_tree_from_jwt(), None):
        abort_with_message(404, "User not found")
    abort_unless_lower_role(user_id)
    is_admin = has_permissions({PERM_ADD_OTHER_TREE_USER})
    if not is_admin and get_link(user_id) is None:
        abort_with_message(422, MSG_LINK_FIRST)

    token = create_access_token(
        identity=user_id,
        additional_claims={
            "old_hash": get_pwhash(user_name),
            CLAIM_LIMITED_SCOPE: SCOPE_RESET_PW,
        },
        expires_delta=VALID_FOR,
    )
    url = invite_url(token)
    expires = datetime.datetime.now(datetime.timezone.utc) + VALID_FOR

    email_sent = False
    email_error = None
    wants_email = request.args.get("send_email", "1") != "0"
    if wants_email and email_configured():
        details = get_user_details(user_name) or {}
        email = details.get("email")
        if not email:
            email_error = MSG_NO_EMAIL
        else:
            try:
                send_email(
                    subject="Kutsu sukupuuhun: aseta salasanasi",
                    body=_email_body(details.get("full_name"), user_name, url),
                    to=[email],
                )
                email_sent = True
            except Exception as exc:  # pylint: disable=broad-except
                current_app.logger.warning("Invitation e-mail failed: %s", exc)
                email_error = "The e-mail could not be sent."
    return jsonify(
        {
            "url": url,
            "expires": expires.isoformat(),
            "email_configured": email_configured(),
            "email_sent": email_sent,
            "email_error": email_error,
        }
    )


def init_app(app: Flask) -> None:
    app.add_url_rule(
        INVITES_PATH + "<string:user_name>/",
        "juurijoki_invite",
        _create_invite,
        methods=["POST"],
    )
