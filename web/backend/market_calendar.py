"""
Market calendar utilities for CIPHER trade validation.
Provides holiday awareness, valid expiry computation, and calendar context injection.
"""
from datetime import date, datetime, timedelta
from typing import List

try:
    import pytz as _pytz
    _ET = _pytz.timezone("America/New_York")
except ImportError:
    _pytz = None
    _ET = None


MARKET_HOLIDAYS_2026 = {
    date(2026, 1, 1),    # New Year's Day
    date(2026, 1, 19),   # MLK Day
    date(2026, 2, 16),   # Presidents Day
    date(2026, 4, 3),    # Good Friday
    date(2026, 5, 25),   # Memorial Day
    date(2026, 7, 3),    # Independence Day observed
    date(2026, 9, 7),    # Labor Day
    date(2026, 11, 26),  # Thanksgiving
    date(2026, 12, 25),  # Christmas
}


def is_valid_trading_day(d: date) -> bool:
    """Returns True if d is a valid US market trading day (not weekend, not holiday)."""
    if d.weekday() >= 5:  # Saturday=5, Sunday=6
        return False
    if d in MARKET_HOLIDAYS_2026:
        return False
    return True


def nearest_valid_friday_expiry(d: date) -> date:
    """Given a date, return the nearest valid Friday expiry on or before d."""
    candidate = d
    while candidate.weekday() != 4 or not is_valid_trading_day(candidate):
        candidate -= timedelta(days=1)
        # Safety guard: don't walk back more than 2 weeks
        if (d - candidate).days > 14:
            break
    return candidate


def get_valid_weekly_expiries(start: date, weeks: int = 4) -> List[date]:
    """Return the next N valid weekly Friday expiry dates on or after start."""
    expiries: List[date] = []
    candidate = start
    while len(expiries) < weeks:
        if candidate.weekday() == 4 and is_valid_trading_day(candidate):
            expiries.append(candidate)
        candidate += timedelta(days=1)
    return expiries


def get_trading_calendar_context() -> str:
    """
    Build a compact calendar context string for injection into CIPHER's market context.
    Shows today's date ET and the next 4 valid weekly expiry Fridays.
    """
    if _ET and _pytz:
        today = datetime.now(_ET).date()
    else:
        # Fallback: use UTC date
        today = datetime.utcnow().date()

    valid_expiries = get_valid_weekly_expiries(today, weeks=4)
    expiry_str = ", ".join(e.strftime("%a %b %d") for e in valid_expiries)

    return (
        f"TODAY: {today.strftime('%A %B %d %Y')} ET\n"
        f"VALID_WEEKLY_EXPIRIES: {expiry_str}\n"
        f"CALENDAR_RULE: Options expire ONLY on valid trading Fridays. "
        f"Never recommend an expiry on a Saturday, Sunday, or market holiday. "
        f"Always choose from VALID_WEEKLY_EXPIRIES above."
    )
