@echo off
echo Starting Clinic System...
start /min cmd /c "npm run dev"
timeout /t 5
start http://localhost:3000
exit
