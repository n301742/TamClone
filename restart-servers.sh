#!/bin/bash

echo "🛑 Stopping any running servers..."

# Kill any processes running on our target ports
if lsof -i:3000 > /dev/null; then
  echo "Killing process on port 3000..."
  kill -9 $(lsof -t -i:3000)
fi

if lsof -i:5173 > /dev/null; then
  echo "Killing process on port 5173..."
  kill -9 $(lsof -t -i:5173)
fi

# Also kill any potential stray processes
pkill -f "node.*vite" || true
pkill -f "node.*ts-node" || true

echo "✅ All servers stopped"

# Wait a moment to ensure ports are released
sleep 2

# Start backend server
echo "🚀 Starting backend server on port 3000..."
cd /home/neo/cursor/BriefButler/backend
npm run dev &
BACKEND_PID=$!

# Give backend a moment to start
sleep 3

# Start frontend server
echo "🚀 Starting frontend server on port 5173..."
cd /home/neo/cursor/BriefButler/frontend
npm run dev &
FRONTEND_PID=$!

echo "✅ Servers started!"
echo "📝 Backend running on http://localhost:3000 (PID: $BACKEND_PID)"
echo "🌐 Frontend running on http://localhost:5173 (PID: $FRONTEND_PID)"
echo ""
echo "Press Ctrl+C to stop both servers"

# Keep script running until user cancels
wait 