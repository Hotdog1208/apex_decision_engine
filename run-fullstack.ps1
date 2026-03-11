# Run both backend and frontend. Open two terminals or use jobs.
Write-Host "Starting APEX full stack..."
Write-Host "1. Backend: http://localhost:8000"
Write-Host "2. Frontend: http://localhost:3000"
Write-Host ""
Write-Host "Start backend in one terminal: .\run-backend.ps1"
Write-Host "Start frontend in another: cd web\frontend; npm run dev"
Write-Host ""
# Start backend in background, then frontend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; .\venv\Scripts\Activate.ps1; .\venv\Scripts\python.exe -m uvicorn web.backend.app:app --reload --host 0.0.0.0 --port 8000"
Start-Sleep -Seconds 3
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\web\frontend'; npm run dev"
