@echo off
echo.
echo  ============================================
echo   QuoteFlow v3.0  -  LED Quotation Manager
echo  ============================================
echo.

:: Install server dependencies if needed
if not exist "server\node_modules" (
    echo [1/2] Installing server dependencies...
    cd server && npm install && cd ..
    echo.
)

:: Install client dependencies if needed
if not exist "client\node_modules" (
    echo [2/2] Installing client dependencies...
    cd client && npm install && cd ..
    echo.
)

:: Get local IP address
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set LAN_IP=%%a
    goto :found
)
:found
set LAN_IP=%LAN_IP: =%

echo  Starting backend on ALL interfaces (0.0.0.0:3001)...
start "QuoteFlow Backend" cmd /k "cd server && node index.js"
timeout /t 3 /nobreak > nul

echo  Starting frontend on ALL interfaces (0.0.0.0:3000)...
start "QuoteFlow Frontend" cmd /k "cd client && set HOST=0.0.0.0 && npm start"

echo.
echo  ============================================
echo   App is starting...
echo.
echo   This device:   http://localhost:3000
echo   Other devices: http://%LAN_IP%:3000
echo.
echo   Backend API:   http://%LAN_IP%:3001
echo  ============================================
echo.
echo   First time? Go to /register to create your account.
echo   Make sure port 3000 and 3001 are allowed in Firewall.
echo.
pause
