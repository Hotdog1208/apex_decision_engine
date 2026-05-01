"""Unit tests for market_calendar.py — must pass before Mission 3."""
from datetime import date
from market_calendar import is_valid_trading_day, nearest_valid_friday_expiry


def test_saturday_invalid():
    assert is_valid_trading_day(date(2026, 5, 2)) is False, "May 2 2026 is Saturday"

def test_friday_valid():
    assert is_valid_trading_day(date(2026, 5, 1)) is True, "May 1 2026 is Friday"

def test_next_friday_valid():
    assert is_valid_trading_day(date(2026, 5, 8)) is True, "May 8 2026 is Friday"

def test_good_friday_invalid():
    assert is_valid_trading_day(date(2026, 4, 3)) is False, "Apr 3 2026 is Good Friday (holiday)"

def test_nearest_valid_expiry_from_saturday():
    result = nearest_valid_friday_expiry(date(2026, 5, 2))
    assert result == date(2026, 5, 1), f"Expected May 1, got {result}"


if __name__ == '__main__':
    tests = [
        test_saturday_invalid,
        test_friday_valid,
        test_next_friday_valid,
        test_good_friday_invalid,
        test_nearest_valid_expiry_from_saturday,
    ]
    passed = 0
    for t in tests:
        try:
            t()
            print(f"  PASS  {t.__name__}")
            passed += 1
        except AssertionError as e:
            print(f"  FAIL  {t.__name__}: {e}")
        except Exception as e:
            print(f"  ERROR {t.__name__}: {e}")
    print(f"\n{passed}/{len(tests)} tests passed")
    if passed < len(tests):
        raise SystemExit(1)
