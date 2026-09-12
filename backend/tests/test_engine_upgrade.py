from app.auth import hash_password, verify_password
from app.data_analyst_engine import analyze_dataset


def test_password_round_trip() -> None:
    encoded = hash_password('correct horse battery')
    assert verify_password('correct horse battery', encoded)
    assert not verify_password('wrong password', encoded)


def test_engine_detects_trend_and_segment_effect() -> None:
    rows = [
        {'date': f'2026-01-{i:02d}', 'region': 'East' if i <= 5 else 'West', 'sales': 100 + i * 30} for i in range(1, 11)
    ]
    result = analyze_dataset(rows, question='sales')
    types = {signal['type'] for signal in result['signals']}
    assert 'trend' in types
    assert 'segment' in types
    assert result['decision']['readiness'] in {'ready', 'investigate', 'fix-data'}
    assert result['summary']
