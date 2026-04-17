import re
import os

app_path = r"c:\Users\aarav\apex_decision_engine\web\backend\app.py"
with open(app_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update CORS, Security Headers, Rate Limiting
cors_target = """app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)"""
cors_replacement = """cors_origins_str = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173")
origins = [o.strip() for o in cors_origins_str.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.url.path.startswith("/api") or request.url.path.startswith("/auth"):
        response.headers["Cache-Control"] = "no-store"
    return response

import time
from collections import defaultdict
auth_rate_limits = defaultdict(list)
def check_rate_limit(request: Request):
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    auth_rate_limits[ip] = [t for t in auth_rate_limits[ip] if now - t < 60]
    if len(auth_rate_limits[ip]) >= 10:
        from fastapi import HTTPException
        raise HTTPException(status_code=429, detail="Too many requests")
    auth_rate_limits[ip].append(now)"""
content = content.replace(cors_target, cors_replacement)

# 2. Update Auth (JWT, Secret Key)
auth_target = """SECRET_KEY = os.environ.get("ADE_SECRET_KEY", "ade-dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")"""
auth_replacement = """SECRET_KEY = os.environ.get("ADE_SECRET_KEY", "ade-dev-secret-change-in-production")
if len(SECRET_KEY) < 32:
    raise ValueError("ADE_SECRET_KEY must be at least 32 characters long.")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60
REFRESH_TOKEN_EXPIRE_DAYS = 7
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
import re
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid auth token")
        return email
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid auth token")

def create_refresh_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)"""
content = content.replace(auth_target, auth_replacement)

# 3. Add refresh token endpoint
refresh_target = """@app.post("/auth/login")"""
refresh_replacement = """@app.post("/auth/refresh")
async def refresh_token(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        new_token = create_access_token({"sub": email})
        return {"access_token": new_token, "token_type": "bearer"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/auth/login")"""
content = content.replace(refresh_target, refresh_replacement)

# Add Rate Limits to Login/Signup
content = content.replace("@app.post(\"/auth/signup\")\nasync def signup(body: UserCreate)", "@app.post(\"/auth/signup\", dependencies=[Depends(check_rate_limit)])\nasync def signup(body: UserCreate)")
content = content.replace("@app.post(\"/auth/login\")\nasync def login(body: UserLogin)", "@app.post(\"/auth/login\", dependencies=[Depends(check_rate_limit)])\nasync def login(body: UserLogin)")


# 4. Inject get_current_user dependencies to protected routes
routes_to_protect = [
    ("/portfolio", "async def get_portfolio()"),
    ("/trades", "async def get_trades(active_only: bool = False)"),
    ("/trades/run", "async def run_engine()"),
    ("/trades/approve", "async def approve_trade(body: TradeApprove)"),
    ("/trades/{trade_id}", "async def close_trade(trade_id: str, exit_reason: str = \"manual\")"),
    ("/analytics", "async def get_analytics()"),
    ("/watchlists", "async def get_watchlists()"),
    ("/watchlists/{name}", "async def add_to_watchlist(name: str, symbol: str)"),
    ("/watchlists/{name}/{symbol}", "async def remove_from_watchlist(name: str, symbol: str)"),
    ("/price-alerts", "async def create_price_alert(body: PriceAlertCreate)"),
    ("/price-alerts", "async def list_price_alerts()"),
    ("/price-alerts/{alert_id}", "async def delete_price_alert(alert_id: str)"),
    ("/export/trades", "async def export_trades()"),
]

for route, func_sig in routes_to_protect:
    new_func_sig = func_sig.replace(")", ", user: str = Depends(get_current_user))").replace("(, ", "(")
    content = content.replace(func_sig, new_func_sig)


# 5. Sanitize Chat input
chat_target = """@app.post("/chat")
async def chat(body: ChatMessage) -> Dict[str, Any]:
    \"\"\"Send a message to the AI trading assistant. Returns assistant reply.\"\"\"
    session_id = body.session_id or "default"
    if session_id not in chat_sessions:
        chat_sessions[session_id] = []
    chat_sessions[session_id].append({"role": "user", "content": body.message})"""
chat_replacement = """@app.post("/chat")
async def chat(body: ChatMessage, user: str = Depends(get_current_user)) -> Dict[str, Any]:
    \"\"\"Send a message to the AI trading assistant. Returns assistant reply.\"\"\"
    session_id = body.session_id or "default"
    if session_id not in chat_sessions:
        chat_sessions[session_id] = []
    # Basic injection sanitization
    sanitized_msg = body.message.replace("ignore previous instructions", "")
    sanitized_msg = sanitized_msg.replace("system prompt", "")
    chat_sessions[session_id].append({"role": "user", "content": sanitized_msg})"""
content = content.replace(chat_target, chat_replacement)

content = content.replace('async def chat_history(session_id: str = "default")', 'async def chat_history(session_id: str = "default", user: str = Depends(get_current_user))')

# 6. WebSocket Auth
ws_target = """@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    \"\"\"WebSocket for live updates.\"\"\"
    await websocket.accept()"""
ws_replacement = """@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    \"\"\"WebSocket for live updates.\"\"\"
    token = websocket.query_params.get("token")
    if not token:
        await websocket.close(code=1008)
        return
    try:
        jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        await websocket.close(code=1008)
        return

    await websocket.accept()"""
content = content.replace(ws_target, ws_replacement)

# 7. Regex Symbol validation
regex_validate = """import re
from fastapi import HTTPException
def validate_symbol(symbol: str):
    if not symbol: return "AAPL"
    if not re.match(r"^[A-Z0-9.-]{1,10}$", symbol.upper()):
        raise HTTPException(status_code=400, detail="Invalid symbol format")
    return symbol.upper()
"""
if "def validate_symbol" not in content:
    # insert after app instance definition
    content = content.replace('active_trades: List[Dict[str, Any]] = []', regex_validate + '\nactive_trades: List[Dict[str, Any]] = []')

content = content.replace('(symbol or "").upper() or "AAPL"', 'validate_symbol(symbol)')
content = content.replace('(symbol or "AAPL").upper()', 'validate_symbol(symbol)')

# 8. Remove global websocket_clients if it is incorrectly used.
content = content.replace('global websocket_clients\n', '')


with open(app_path, "w", encoding="utf-8") as f:
    f.write(content)
print("app.py patched!")
