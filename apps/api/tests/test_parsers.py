import pytest

from services.matching_service import _parse_size


@pytest.mark.parametrize(
    "text,expected",
    [
        ("1kg rice", 1000.0),
        ("250 g butter", 250.0),
        ("2 lb chicken", pytest.approx(907.184)),
        ("16 oz pasta", pytest.approx(453.592)),
        ("1.5 L milk", 1500.0),
        ("750ml juice", 750.0),
        ("no size here", None),
    ],
)
def test_parse_size(text, expected):
    assert _parse_size(text) == expected

