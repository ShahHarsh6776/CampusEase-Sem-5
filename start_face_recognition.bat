@echo off
:: Campus Ease Face Recognition Startup Script for Windows
:: This script starts both the React frontend and Face Recognition API

echo 🎓 Starting Campus Ease with Face Recognition...

:: Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed. Please install Python first.
    pause
    exit /b 1
)

:: Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js is not installed. Please install Node.js first.
    pause
    exit /b 1
)

:: Navigate to project directory
set PROJECT_DIR=%~dp0
cd /d "%PROJECT_DIR%"

echo 📁 Project directory: %PROJECT_DIR%

:: Check if port 8000 is available (basic check)
netstat -an | find ":8000 " >nul
if not errorlevel 1 (
    echo ⚠️  Port 8000 might be in use
    echo    Please stop any existing services on port 8000
)

:: Create logs directory if it doesn't exist
if not exist "logs" mkdir logs

echo 🔧 Installing Python dependencies...
if exist "face_api_requirements.txt" (
    pip install -r face_api_requirements.txt --quiet
) else (
    echo ❌ face_api_requirements.txt not found
    pause
    exit /b 1
)

echo 📦 Installing Node.js dependencies...
if exist "package.json" (
    call npm install --silent
) else (
    echo ❌ package.json not found
    pause
    exit /b 1
)

echo 🗄️  Setting up environment...
if not exist ".env" (
    if exist ".env.face_recognition" (
        copy ".env.face_recognition" ".env" >nul
        echo ✅ Created .env from .env.face_recognition template
    ) else (
        echo ⚠️  No .env file found. Please create one based on .env.face_recognition
    )
)

echo 🚀 Starting Face Recognition API...
:: Start the FastAPI server in background
start /B python face_recognition_api.py > logs\face_recognition_api.log 2>&1

:: Wait a moment for API to start
timeout /t 3 /nobreak >nul

echo ✅ Face Recognition API starting in background...
echo    Logs available in: logs\face_recognition_api.log

:: Test API health
echo 🏥 Testing API health...
timeout /t 2 /nobreak >nul

:: Try to test the API (Windows doesn't have curl by default, so we skip this test)
echo ⚠️  API health check skipped (requires curl or manual verification)

echo 🌐 Starting React development server...
echo    This will open your browser automatically
echo.
echo 🎯 Access points:
echo    📱 Frontend: http://localhost:5173
echo    🔧 API: http://localhost:8000
echo    📚 API Docs: http://localhost:8000/docs
echo.
echo Press Ctrl+C in any window to stop services
echo.

:: Start React dev server (this will block)
call npm run dev

:: This runs when the npm process exits
echo.
echo 🛑 React server stopped.
echo.
echo 📝 To stop the Face Recognition API:
echo    1. Open Task Manager
echo    2. Look for python.exe processes
echo    3. End the face_recognition_api.py process
echo.
echo 👋 Frontend stopped. API may still be running in background.
pause