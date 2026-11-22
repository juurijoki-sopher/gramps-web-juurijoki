"""WSGI entry point: Gramps Web API with the Juurijoki additions."""

from gramps_webapi.wsgi import app

from . import email_settings, invites, password_reset, userlinks

userlinks.init_app(app)
invites.init_app(app)
email_settings.init_app(app)
password_reset.init_app(app)
