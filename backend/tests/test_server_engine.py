from app.server_engine import analyze_rows, parse_upload


def test_normalizes_persian_numerals_and_profiles_data() -> None:
    result = analyze_rows([
        {'id': '1', 'فروش': '۱۲۳۴', 'منطقه': 'تهران'},
        {'id': '2', 'فروش': '١٣٠٠', 'منطقه': 'تهران'},
        {'id': '3', 'فروش': '1100', 'منطقه': 'تبریز'},
    ], 'کدام منطقه ضعیف‌تر است؟')
    assert result['rows'] == 3
    assert result['resolved_question'] == 'کدام منطقه ضعیف‌تر است؟'
    assert len(result['trace']) == 12


def test_invalid_json_shape_is_rejected() -> None:
    try:
        parse_upload('bad.json', b'{"data":"not-a-list"}')
    except ValueError as exc:
        assert 'data array' in str(exc)
    else:
        raise AssertionError('invalid JSON shape was accepted')
