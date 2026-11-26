"""Links between user accounts and people in the tree.

The tree's privacy rests on its users being members of the family, so a
user account is linked to the person it belongs to:

- A user added by anyone but an administrator must be linked to a person
  in the tree, passed as `?person_handle=` on POST /api/users/<name>/.
  Administrators may add users without a person, such as test or
  technical accounts.
- A person can be linked to one user account only.
- Only administrators import users in bulk (POST /api/users/), as the import
  has no way to name the people.
- An owner cannot give an unlinked account a role (for example to confirm a
  registration) without linking it first; disabling it stays possible.
- Owners link existing unlinked accounts; changing or removing a link is for
  administrators.

Gramps Web API has no such link, so the links are kept in a SQLite database
of their own next to the user database, keyed by the user's ID, which stays
the same when the user is renamed. The checks run before the API's own
handlers, which are not changed.
"""

import os
import re
import sqlite3
import uuid
from contextlib import closing

from flask import Flask, Response, abort, g, jsonify, request
from flask_jwt_extended import verify_jwt_in_request
from gramps_webapi.api.auth import has_permissions
from gramps_webapi.api.util import (
    abort_with_message,
    get_db_handle,
    get_tree_from_jwt,
)
from gramps_webapi.auth import (
    delete_user,
    get_guid,
    get_name,
    get_role,
    get_tree,
)
from gramps_webapi.auth.const import (
    PERM_ADD_OTHER_TREE_USER,
    PERM_EDIT_OTHER_USER,
    PERM_VIEW_OTHER_USER,
    ROLE_GUEST,
)

DB_PATH = os.environ.get(
    "JUURIJOKI_USER_LINKS_DB", "/data/users/user_person_links.sqlite"
)
USER_PATH = re.compile(r"^/api/users/([^/]+)/$")
LINKS_PATH = "/api/juurijoki/user-links/"

# The messages the frontend shows; they are translated there
MSG_PERSON_REQUIRED = "A user must be linked to a person in the tree."
MSG_PERSON_NOT_FOUND = "The person was not found in the tree."
MSG_PERSON_TAKEN = "The person is already linked to another user."
MSG_BULK_ADMIN_ONLY = "Only administrators can import user accounts."
MSG_LINK_FIRST = "Link the user to a person in the tree before giving a role."
MSG_RELINK_ADMIN_ONLY = "Only administrators can change or remove a link."


def _connect():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS user_person_links ("
        " user_id TEXT PRIMARY KEY,"
        " tree TEXT NOT NULL,"
        " person_handle TEXT NOT NULL,"
        " UNIQUE (tree, person_handle))"
    )
    return conn


def get_links(tree):
    """The links of a tree, as {user_id: person_handle}."""
    with closing(_connect()) as conn:
        rows = conn.execute(
            "SELECT user_id, person_handle FROM user_person_links WHERE tree = ?",
            (tree,),
        ).fetchall()
    return dict(rows)


def get_link(user_id):
    with closing(_connect()) as conn:
        row = conn.execute(
            "SELECT person_handle FROM user_person_links WHERE user_id = ?",
            (user_id,),
        ).fetchone()
    return row[0] if row else None


def set_link(user_id, tree, person_handle):
    with closing(_connect()) as conn, conn:
        conn.execute(
            "INSERT INTO user_person_links (user_id, tree, person_handle)"
            " VALUES (?, ?, ?)"
            " ON CONFLICT (user_id) DO UPDATE SET"
            " tree = excluded.tree, person_handle = excluded.person_handle",
            (user_id, tree, person_handle),
        )


def delete_link(user_id):
    with closing(_connect()) as conn, conn:
        conn.execute("DELETE FROM user_person_links WHERE user_id = ?", (user_id,))


def _is_admin():
    # granted to server administrators only, not to tree owners
    return has_permissions({PERM_ADD_OTHER_TREE_USER})


def _signed_in():
    """Whether the request carries a valid access token.

    Without one the API's own handler answers, with a 401.
    """
    try:
        verify_jwt_in_request()
    except Exception:  # pylint: disable=broad-except
        return False
    return True


def _check_person(tree, person_handle, user_id=None):
    """Abort unless the person exists and is free (or already this user's)."""
    if not person_handle:
        abort_with_message(422, MSG_PERSON_REQUIRED)
    db = get_db_handle()
    if not db.has_person_handle(person_handle):
        abort_with_message(422, MSG_PERSON_NOT_FOUND)
    taken_by = {h: u for u, h in get_links(tree).items()}.get(person_handle)
    if taken_by and taken_by != user_id:
        try:
            get_name(_uuid(taken_by))
        except ValueError:
            # the user was deleted outside this API: the person is free
            delete_link(taken_by)
        else:
            abort_with_message(409, MSG_PERSON_TAKEN)


def _user_id_or_none(user_name):
    """The user's ID as a string, as the links store it."""
    try:
        return str(get_guid(user_name))
    except ValueError:
        return None


def _uuid(user_id):
    # the user database functions take the ID as a UUID
    return uuid.UUID(user_id)


def _before_request():
    path = request.path
    if path == "/api/users/" and request.method == "POST":
        if _signed_in() and not _is_admin():
            abort_with_message(403, MSG_BULK_ADMIN_ONLY)
        return None
    match = USER_PATH.match(path)
    if not match or match.group(1) == "-":
        return None
    user_name = match.group(1)
    if not _signed_in():
        return None
    tree = get_tree_from_jwt()
    if request.method == "POST":
        person_handle = request.args.get("person_handle", "")
        if person_handle or not _is_admin():
            _check_person(tree, person_handle)
            g.juurijoki_link = (user_name, tree, person_handle)
    elif request.method == "PUT":
        body = request.get_json(silent=True) or {}
        role = body.get("role")
        # a role that is not a number is the API's to refuse, with a 422
        if not isinstance(role, int) or isinstance(role, bool):
            return None
        if role < ROLE_GUEST or _is_admin():
            return None
        user_id = _user_id_or_none(user_name)
        if user_id and get_link(user_id) is None and get_role(_uuid(user_id)) != role:
            abort_with_message(422, MSG_LINK_FIRST)
    elif request.method == "DELETE":
        g.juurijoki_unlink = _user_id_or_none(user_name)
    return None


def _after_request(response: Response):
    if response.status_code in (200, 201):
        if getattr(g, "juurijoki_link", None):
            user_name, tree, person_handle = g.juurijoki_link
            user_id = _user_id_or_none(user_name)
            if user_id and person_handle:
                try:
                    set_link(user_id, get_tree(_uuid(user_id)) or tree, person_handle)
                except Exception:  # pylint: disable=broad-except
                    # never leave a new user without its person
                    delete_user(user_name)
                    raise
        if getattr(g, "juurijoki_unlink", None):
            delete_link(g.juurijoki_unlink)
    return response


def _list_links():
    verify_jwt_in_request()
    if not has_permissions({PERM_VIEW_OTHER_USER}):
        abort(403)
    tree = get_tree_from_jwt()
    data = []
    for user_id, person_handle in get_links(tree).items():
        try:
            name = get_name(_uuid(user_id))
        except ValueError:
            continue  # user deleted outside this API, e.g. on the command line
        data.append({"name": name, "person_handle": person_handle})
    return jsonify(data)


def _put_link(user_name):
    verify_jwt_in_request()
    if not has_permissions({PERM_EDIT_OTHER_USER}):
        abort(403)
    tree = get_tree_from_jwt()
    user_id = _user_id_or_none(user_name)
    if user_id is None or get_tree(_uuid(user_id)) not in (tree, None):
        abort(404)
    current = get_link(user_id)
    if current and not _is_admin():
        abort_with_message(403, MSG_RELINK_ADMIN_ONLY)
    body = request.get_json(silent=True) or {}
    person_handle = body.get("person_handle", "")
    _check_person(tree, person_handle, user_id=user_id)
    set_link(user_id, get_tree(_uuid(user_id)) or tree, person_handle)
    return jsonify({"name": user_name, "person_handle": person_handle})


def _delete_link(user_name):
    verify_jwt_in_request()
    if not _is_admin():
        abort_with_message(403, MSG_RELINK_ADMIN_ONLY)
    user_id = _user_id_or_none(user_name)
    if user_id is None:
        abort(404)
    delete_link(user_id)
    return "", 200


def init_app(app: Flask) -> None:
    """Add the checks and the link endpoints to the API app."""
    app.before_request(_before_request)
    app.after_request(_after_request)
    app.add_url_rule(LINKS_PATH, "juurijoki_user_links", _list_links)
    app.add_url_rule(
        LINKS_PATH + "<string:user_name>/",
        "juurijoki_user_link",
        _put_link,
        methods=["PUT"],
    )
    app.add_url_rule(
        LINKS_PATH + "<string:user_name>/",
        "juurijoki_user_unlink",
        _delete_link,
        methods=["DELETE"],
    )
