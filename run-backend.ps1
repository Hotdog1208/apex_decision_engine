# Run ADE backend using project venv (no activation needed)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
& "$scriptDir\venv\Scripts\python.exe" -m uvicorn web.backend.app:app --reload --host 0.0.0.0 --port 8000
