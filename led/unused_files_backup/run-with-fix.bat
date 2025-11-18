@echo off
echo Starting web server with Rube Draco pricing fix...
echo.
echo Please open your browser to http://127.0.0.1:5506
echo.
echo Press Ctrl+C to stop the server when done.
echo.
cd /d "%~dp0"
python -m http.server 5506 || (
  echo.
  echo Failed to start Python HTTP server.
  echo Trying with Node.js...
  npx http-server -p 5506
)
