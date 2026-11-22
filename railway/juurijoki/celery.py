"""Celery entry point: the API's worker with the Juurijoki fixes.

The worker sends the API's own e-mails, such as password reset links, so
it needs the same SMTP encryption fix as the web process.
"""

from gramps_webapi.celery import celery  # noqa: F401

from .email_settings import install_smtp_fix

install_smtp_fix()
