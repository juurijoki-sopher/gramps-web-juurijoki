"""WSGI entry point: Gramps Web API with the Juurijoki additions."""

from gramps_webapi.wsgi import app

from . import invites, userlinks

userlinks.init_app(app)
invites.init_app(app)
