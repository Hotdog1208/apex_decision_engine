"""
E-Trade Real API Connector.
Implementation of the ETrade API using OAuth 1.0a.
"""

import os
import json
import logging
import asyncio
import webbrowser
from typing import Optional
from pathlib import Path
from rauth import OAuth1Service  # type: ignore
from dotenv import load_dotenv  # type: ignore

load_dotenv()

logger = logging.getLogger(__name__)

# Choose Prod or Sandbox based on a env var or default to Sandbox to be safe
BASE_URL = os.getenv("ETRADE_BASE_URL", "https://apisb.etrade.com")

class ETradeRealConnector:
    """Real E-Trade API Connector using OAuth 1.0a."""

    def __init__(self):
        self.base_url = BASE_URL
        self.consumer_key = os.getenv("ETRADE_CONSUMER_KEY")
        self.consumer_secret = os.getenv("ETRADE_CONSUMER_SECRET")
        self.session = None
        self.token_file = Path("data/etrade_tokens.json")

        if self.consumer_key and self.consumer_secret:
            self.oauth = OAuth1Service(
                name="etrade",
                consumer_key=self.consumer_key,
                consumer_secret=self.consumer_secret,
                request_token_url=f"{self.base_url}/oauth/request_token",
                access_token_url=f"{self.base_url}/oauth/access_token",
                authorize_url="https://us.etrade.com/e/t/etws/authorize",
                base_url=self.base_url
            )
        else:
            self.oauth = None

    def connect(self) -> bool:
        """Establish connection using E-Trade OAuth 1.0a flow."""
        if not self.oauth:
            logger.error("Cannot connect to E-Trade: Missing ETRADE_CONSUMER_KEY or ETRADE_CONSUMER_SECRET in .env.")
            return False

        # Try loading cached token
        if self.token_file.exists():
            try:
                with open(self.token_file, "r") as f:
                    tokens = json.load(f)
                access_token = tokens.get("access_token")  # type: ignore
                access_token_secret = tokens.get("access_token_secret")  # type: ignore

                if access_token and access_token_secret:
                    self.session = self.oauth.get_session((access_token, access_token_secret))
                    # Validate session
                    resp = self.session.get(f"{self.base_url}/v1/market/quote/SPY.json")  # type: ignore
                    if resp.status_code == 200:
                        logger.info("Successfully connected to E-Trade via cached token.")
                        return True
                    else:
                        logger.info("Cached E-Trade token expired.")
                        self.session = None
            except Exception as e:
                logger.error(f"Error loading cached tokens: {e}")

        # Interactive OAuth 1.0a flow
        print("\n" + "="*80)
        print("E-TRADE OAUTH 1.0a AUTHORIZATION REQUIRED")
        
        try:
            req_token, req_token_secret = self.oauth.get_request_token(
                params={"oauth_callback": "oob", "format": "json"}
            )
        except Exception as e:
            logger.error(f"Failed to get request token: {e}. Check your keys or Sandbox status.")
            return False

        auth_url = self.oauth.get_authorize_url(req_token)
        print(f"Please authorize the application by visiting this URL:\n\n{auth_url}\n")
        print("="*80 + "\n")

        try:
            webbrowser.open(auth_url)
        except:
            pass

        verifier = input("Enter the 5-character authorization code from E-Trade: ").strip()

        try:
            self.session = self.oauth.get_auth_session(
                req_token,
                req_token_secret,
                method="POST",
                data={"oauth_verifier": verifier}
            )

            # Cache tokens for future use
            self.token_file.parent.mkdir(parents=True, exist_ok=True)
            with open(self.token_file, "w") as f:
                json.dump({
                    "access_token": self.session.access_token,  # type: ignore
                    "access_token_secret": self.session.access_token_secret  # type: ignore
                }, f)

            logger.info("Successfully authenticated with E-Trade.")
            return True
        except Exception as e:
            logger.error(f"E-Trade authentication failed: {e}")
            return False

    def is_connected(self) -> bool:
        return self.session is not None

    async def get_option_chains(self, symbol: str, expiry_year: Optional[int] = None, expiry_month: Optional[int] = None) -> dict:
        """Fetch option chains for a specific symbol asynchronously."""
        if not self.session:
            raise RuntimeError("Not connected to E-Trade. Call connect() first.")

        url = f"{self.base_url}/v1/market/optionchains.json"
        
        # We only request options for the given symbol. Future expirations are returned automatically or specified.
        params = {"symbol": symbol}
        if expiry_year:
            params["expiryYear"] = str(expiry_year)
        if expiry_month:
            params["expiryMonth"] = str(expiry_month)

        session = self.session
        def _fetch():
            resp = session.get(url, params=params)  # type: ignore
            resp.raise_for_status()
            return resp.json()

        return await asyncio.to_thread(_fetch)  # type: ignore
