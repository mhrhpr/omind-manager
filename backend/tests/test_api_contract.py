from app.main import app


def test_health_route_is_exposed() -> None:
    routes = {route.path for route in app.routes}
    assert '/health' in routes


def test_analysis_and_decision_routes_are_exposed() -> None:
    routes = {route.path for route in app.routes}
    assert '/analyses' in routes
    assert '/analyses/{analysis_id}' in routes
    assert '/decisions' in routes
