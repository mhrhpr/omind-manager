from app.data_analyst_engine import analyze_dataset


def test_empty_dataset_is_insufficient() -> None:
    result = analyze_dataset([])
    assert result['status'] == 'insufficient_data'
    assert result['signals'] == []


def test_profiles_numeric_date_and_dimensions() -> None:
    rows = [
        {'date': '2026-01-01', 'region': 'A', 'sales': '۱۰۰', 'orders': '10'},
        {'date': '2026-01-02', 'region': 'B', 'sales': '120', 'orders': '12'},
        {'date': '2026-01-03', 'region': 'A', 'sales': '90', 'orders': '9'},
        {'date': '2026-01-04', 'region': 'B', 'sales': '80', 'orders': '8'},
    ]
    result = analyze_dataset(rows, question='فروش')
    assert result['status'] == 'ok'
    assert result['dataset']['date_column'] == 'date'
    assert 'sales' in result['dataset']['measures']
    assert 'region' in result['dataset']['dimensions']
    assert result['analyst']['focus'] == 'sales'


def test_anomaly_signal_has_evidence_and_guardrail() -> None:
    rows = [
        {'date': '2026-01-01', 'sales': 100},
        {'date': '2026-01-02', 'sales': 102},
        {'date': '2026-01-03', 'sales': 98},
        {'date': '2026-01-04', 'sales': 101},
        {'date': '2026-01-05', 'sales': 1000},
    ]
    result = analyze_dataset(rows)
    anomalies = [signal for signal in result['signals'] if signal['type'] == 'anomaly']
    assert anomalies
    assert anomalies[0]['evidence']['outlier_count'] == 1
    assert 'guardrail' in anomalies[0]
    assert 'confidence' in anomalies[0]
    assert 'impact' in anomalies[0]


def test_relationship_signal_does_not_claim_causation() -> None:
    rows = [
        {'x': 1, 'y': 10}, {'x': 2, 'y': 11}, {'x': 3, 'y': 14}, {'x': 4, 'y': 15},
        {'x': 5, 'y': 18}, {'x': 6, 'y': 20}, {'x': 7, 'y': 21}, {'x': 8, 'y': 25},
    ]
    result = analyze_dataset(rows)
    relationships = [signal for signal in result['signals'] if signal['type'] == 'relationship']
    assert relationships
    assert 'causation' in relationships[0]['guardrail'].lower()


def test_low_quality_adds_quality_signal() -> None:
    rows = [{'sales': 100}, {'sales': 110}, {'sales': 90}, {'sales': 95}]
    result = analyze_dataset(rows, quality={'score': 61, 'warnings': ['High missingness']})
    quality_signals = [signal for signal in result['signals'] if signal['type'] == 'quality']
    assert quality_signals
    assert quality_signals[0]['evidence']['score'] == 61


def test_recommendation_is_based_on_top_signal() -> None:
    rows = [
        {'date': '2026-01-01', 'region': 'A', 'sales': 100},
        {'date': '2026-01-02', 'region': 'A', 'sales': 105},
        {'date': '2026-01-03', 'region': 'B', 'sales': 95},
        {'date': '2026-01-04', 'region': 'B', 'sales': 90},
        {'date': '2026-01-05', 'region': 'A', 'sales': 1000},
    ]
    result = analyze_dataset(rows)
    assert result['recommendations']
    assert result['recommendations'][0]['based_on'][0]['type'] == result['signals'][0]['type']
