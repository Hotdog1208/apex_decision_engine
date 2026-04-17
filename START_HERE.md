# APEX Decision Engine — Start Here

## If pages show empty (News, Screener, Alerts, Chat)

**Both backend and frontend must be running.**

### 1. Start backend (Terminal 1)

```powershell
cd <your_project_path>
.\run-backend.ps1
```

Or manually:
```powershell
.\venv\Scripts\Activate.ps1
python -m uvicorn web.backend.app:app --reload --host 0.0.0.0 --port 8000
```

You should see: `INFO:     Uvicorn running on http://0.0.0.0:8000`

### 2. Start frontend (Terminal 2)

```powershell
cd <your_project_path>\web\frontend
npm run dev
```

You should see: `Local: http://localhost:3000`

### 3. Open

http://localhost:3000

---

## First-time setup

If you haven't run the project before:

```powershell
cd <your_project_path>

# Create venv and install Python deps
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r web\requirements.txt

# Install frontend deps
cd web\frontend
npm install
```

---

## Verify backend is running

- Open http://localhost:8000/health — should return `{"status":"ok"}`
- Open http://localhost:8000/news — should return JSON with news items

If these fail, the backend is not running or not reachable.
