"""
Tier enforcement system for Apex Decision Engine.

Tiers: free | edge | alpha | apex
Default for all new users: free

This module is the single source of truth for tier limits.
Change TIER_LIMITS to adjust access without redeployment.
"""

import logging
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Tier limit configuration — edit here, not in endpoint code
# ---------------------------------------------------------------------------
TIER_LIMITS: Dict[str, Dict[str, Any]] = {
    "free": {
        "signal_count":          0,        # no live signals served
        "signal_refresh_seconds": 3600,    # N/A but stored for reference
        "reasoning_full":        False,
        "uoa_visible":           False,
        "chart_indicators":      "basic",
        "screener_full":         True,     # screener visible on free
        "chat_access":           False,
        "chat_daily_limit":      0,
        "alerts_count":          0,
        "portfolio_access":      False,
        "csv_export":            False,
        "signal_hub_preview":    True,     # grayed-out preview allowed
    },
    "edge": {
        "signal_count":          20,
        "signal_refresh_seconds": 900,    # 15 min
        "reasoning_full":        True,
        "uoa_visible":           True,
        "chart_indicators":      "full",
        "screener_full":         True,
        "chat_access":           False,
        "chat_daily_limit":      0,
        "alerts_count":          10,
        "portfolio_access":      False,
        "csv_export":            False,
        "signal_hub_preview":    False,
    },
    "alpha": {
        "signal_count":          9999,     # unlimited
        "signal_refresh_seconds": 300,    # 5 min
        "reasoning_full":        True,
        "uoa_visible":           True,
        "chart_indicators":      "full",
        "screener_full":         True,
        "chat_access":           True,
        "chat_daily_limit":      20,
        "alerts_count":          50,
        "portfolio_access":      False,
        "csv_export":            False,
        "signal_hub_preview":    False,
    },
    "apex": {
        "signal_count":          9999,
        "signal_refresh_seconds": 300,
        "reasoning_full":        True,
        "uoa_visible":           True,
        "chart_indicators":      "full",
        "screener_full":         True,
        "chat_access":           True,
        "chat_daily_limit":      9999,    # unlimited
        "alerts_count":          9999,
        "portfolio_access":      True,
        "csv_export":            True,
        "signal_hub_preview":    False,
    },
}

VALID_TIERS = set(TIER_LIMITS.keys())
UPGRADE_PATH = {"free": "edge", "edge": "alpha", "alpha": "apex", "apex": None}

# Cache refresh TTL in seconds by tier (used by signal cache)
TIER_CACHE_TTL = {
    "free":  3600,
    "edge":   900,   # 15 min
    "alpha":  300,   # 5 min
    "apex":   300,
}


def get_user_tier(user_email: str, users_db: Dict[str, Dict[str, Any]]) -> str:
    """Return the tier for a user. Defaults to 'free' if user not found or tier unset."""
    user = users_db.get(user_email, {})
    tier = user.get("tier", "free")
    return tier if tier in VALID_TIERS else "free"


def check_tier_access(
    user_email: str,
    feature: str,
    users_db: Dict[str, Dict[str, Any]],
    current_usage: int = 0,
) -> Tuple[bool, Optional[Dict[str, Any]]]:
    """
    Check whether a user can access a feature at a given usage level.

    Returns (allowed: bool, error_payload: dict | None).
    If allowed is False, error_payload is the JSON body to return as HTTP 403.
    """
    tier = get_user_tier(user_email, users_db)
    limits = TIER_LIMITS.get(tier, TIER_LIMITS["free"])

    # Boolean features
    bool_features = {
        "reasoning_full", "uoa_visible", "chat_access",
        "portfolio_access", "csv_export",
    }
    if feature in bool_features:
        allowed = bool(limits.get(feature, False))
        if not allowed:
            return False, _tier_error(feature, None, None, tier)
        return True, None

    # Count-limited features
    count_features = {
        "signal_count": "signal_count",
        "chat_daily_limit": "chat_daily_limit",
        "alerts_count": "alerts_count",
    }
    if feature in count_features:
        limit = limits.get(feature, 0)
        if limit == 0:
            return False, _tier_error(feature, limit, current_usage, tier)
        if current_usage >= limit:
            return False, _tier_error(feature, limit, current_usage, tier)
        return True, None

    # Feature not in gating table — allow by default
    logger.debug("Feature '%s' not in tier gate, allowing by default", feature)
    return True, None


def _tier_error(
    feature: str,
    limit: Optional[int],
    current: Optional[int],
    tier: str,
) -> Dict[str, Any]:
    payload: Dict[str, Any] = {
        "error":       "tier_limit",
        "feature":     feature,
        "current_tier": tier,
    }
    if limit is not None:
        payload["limit"] = limit
    if current is not None:
        payload["current"] = current
    upgrade = UPGRADE_PATH.get(tier)
    if upgrade:
        payload["upgrade_to"] = upgrade
        payload["message"] = (
            f"Your {tier.upper()} tier does not include '{feature}'. "
            f"Upgrade to {upgrade.upper()} to unlock it."
        )
    else:
        payload["message"] = f"Feature '{feature}' not included in {tier.upper()} tier."
    return payload


def get_cache_ttl(user_email: str, users_db: Dict[str, Dict[str, Any]]) -> int:
    """Return signal cache TTL in seconds for a user's tier."""
    tier = get_user_tier(user_email, users_db)
    return TIER_CACHE_TTL.get(tier, 900)
