#!/bin/bash

# Campus Ease Face Recognition Startup Script
# This script starts both the React frontend and Face Recognition API

echo "🎓 Starting Campus Ease with Face Recognition..."

# Check if Python is installed
if ! command -v python &> /dev/null; then
    echo "❌ Python is not installed. Please install Python first."
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Navigate to project directory
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "📁 Project directory: $PROJECT_DIR"

# Function to check if port is available
check_port() {
    if lsof -i :$1 > /dev/null 2>&1; then
        echo "⚠️  Port $1 is already in use"
        return 1
    fi
    return 0
}

# Check required ports
if ! check_port 8000; then
    echo "❌ Face Recognition API port (8000) is already in use"
    echo "   Please stop the existing service or change the port"
    exit 1
fi

if ! check_port 5173; then
    echo "⚠️  React dev server port (5173) is already in use"
    echo "   Vite will try to use the next available port"
fi

# Create logs directory if it doesn't exist
mkdir -p logs

echo "🔧 Installing Python dependencies..."
if [ -f "face_api_requirements.txt" ]; then
    pip install -r face_api_requirements.txt --quiet
else
    echo "❌ face_api_requirements.txt not found"
    exit 1
fi

echo "📦 Installing Node.js dependencies..."
if [ -f "package.json" ]; then
    npm install --silent
else
    echo "❌ package.json not found"
    exit 1
fi

echo "🗄️  Setting up environment..."
if [ ! -f ".env" ]; then
    if [ -f ".env.face_recognition" ]; then
        cp .env.face_recognition .env
        echo "✅ Created .env from .env.face_recognition template"
    else
        echo "⚠️  No .env file found. Please create one based on .env.face_recognition"
    fi
fi

echo "🚀 Starting Face Recognition API..."
# Start the FastAPI server in background
python face_recognition_api.py > logs/face_recognition_api.log 2>&1 &
API_PID=$!
echo "   API PID: $API_PID (logs: logs/face_recognition_api.log)"

# Wait a moment for API to start
sleep 3

# Check if API started successfully
if kill -0 $API_PID 2>/dev/null; then
    echo "✅ Face Recognition API started successfully"
else
    echo "❌ Failed to start Face Recognition API"
    echo "   Check logs/face_recognition_api.log for details"
    exit 1
fi

# Test API health
echo "🏥 Testing API health..."
sleep 2
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ API health check passed"
else
    echo "⚠️  API health check failed, but continuing..."
fi

echo "🌐 Starting React development server..."
echo "   This will open your browser automatically"
echo ""
echo "🎯 Access points:"
echo "   📱 Frontend: http://localhost:5173"
echo "   🔧 API: http://localhost:8000"
echo "   📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start React dev server (this will block)
npm run dev

# This runs when Ctrl+C is pressed
echo ""
echo "🛑 Stopping services..."

# Kill the API server
if kill -0 $API_PID 2>/dev/null; then
    kill $API_PID
    echo "✅ Face Recognition API stopped"
fi

echo "👋 All services stopped. Goodbye!"