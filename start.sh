#!/bin/bash
echo ""
echo " ============================================"
echo "  QuoteFlow v3.0  -  LED Quotation Manager"
echo " ============================================"
echo ""

# Install dependencies if needed
if [ ! -d "server/node_modules" ]; then
  echo "[1/2] Installing server dependencies..."
  cd server && npm install && cd ..
  echo ""
fi

if [ ! -d "client/node_modules" ]; then
  echo "[2/2] Installing client dependencies..."
  cd client && npm install && cd ..
  echo ""
fi

# Detect LAN IP
if command -v ipconfig &> /dev/null; then
  LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
else
  LAN_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
fi
LAN_IP=${LAN_IP:-"<your-local-ip>"}

# Start backend on 0.0.0.0
echo " Starting backend on 0.0.0.0:3001..."
cd server && node index.js &
SERVER_PID=$!
cd ..
sleep 2

# Start frontend on 0.0.0.0
echo " Starting frontend on 0.0.0.0:3000..."
cd client && HOST=0.0.0.0 npm start &
CLIENT_PID=$!
cd ..

echo ""
echo " ============================================"
echo "  This device:   http://localhost:3000"
echo "  Other devices: http://${LAN_IP}:3000"
echo ""
echo "  Backend API:   http://${LAN_IP}:3001"
echo " ============================================"
echo ""
echo "  First time? Register at /register"
echo "  Press Ctrl+C to stop both servers"
echo ""

# Cleanup on exit
trap "echo 'Stopping servers...'; kill $SERVER_PID $CLIENT_PID 2>/dev/null" EXIT
wait
