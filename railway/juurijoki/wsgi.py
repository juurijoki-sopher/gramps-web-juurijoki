"""WSGI entry point: Gramps Web API with the Juurijoki additions."""

from gramps_webapi.wsgi import app

from .userlinks import init_app

init_app(app)
