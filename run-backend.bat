@echo off
REM Run ADE backend using project venv
"%~dp0venv\Scripts\python.exe" -m uvicorn web.backend.app:app --reload --host 0.0.0.0 --port 8000
