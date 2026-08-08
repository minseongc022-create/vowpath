"""Dashboard package.

Note: do NOT bind the FastAPI instance to package attribute ``app``.
That would shadow the ``oracle.dashboard.app`` submodule and break imports.
"""

from oracle.dashboard.app import create_app

__all__ = ["create_app"]
