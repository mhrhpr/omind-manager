from uuid import uuid4

from fastapi import HTTPException

from app.auth import hash_token, issue_token, require_workspace
from app.main import app


def test_health_route_is_exposed() -> None:
    routes = {route.path for route in app.routes}
    assert '/health' in routes


def test_product_routes_are_exposed() -> None:
    routes = {route.path for route in app.routes}
    assert '/workspaces' in routes
    assert '/workspaces/{workspace_id}/analyses' in routes
    assert '/analyses' in routes
    assert '/analyses/{analysis_id}' in routes
    assert '/decisions' in routes
    assert '/decisions/{decision_id}/outcome' in routes
    assert '/auth/signup' in routes
    assert '/auth/login' in routes
    assert '/auth/me' in routes


def test_tokens_are_random_and_hashed() -> None:
    a, b = issue_token(), issue_token()
    assert a != b
    assert a != hash_token(a)


def test_missing_workspace_auth_is_rejected() -> None:
    class FakeDB:
        def get(self, *_args, **_kwargs):
            return None
    try:
        require_workspace(uuid4(), None, FakeDB())
    except HTTPException as exc:
        assert exc.status_code == 401
    else:
        raise AssertionError('missing auth was accepted')


def test_invalid_workspace_auth_is_rejected() -> None:
    class FakeDB:
        def get(self, *_args, **_kwargs):
            class Workspace:
                id = uuid4()
                auth_token_hash = hash_token('expected')
            return Workspace()

        def scalar(self, *_args, **_kwargs):
            return None

    try:
        require_workspace(uuid4(), 'Bearer wrong', FakeDB())
    except HTTPException as exc:
        assert exc.status_code == 403
    else:
        raise AssertionError('invalid auth was accepted')
