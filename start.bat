@echo off
title EduPath Navigator
echo.
echo  EduPath Navigator
echo  -----------------
if not exist node_modules (
  echo Installing dependencies...
  call npm install
  if errorlevel 1 goto :error
)
if not exist .env (
  echo Creating .env from .env.example...
  copy /Y .env.example .env >nul
  echo.
  echo Add your GEMINI_API_KEY to .env before using AI features.
)
echo Starting EduPath...
call npm run dev
goto :eof
:error
echo.
echo Dependency installation failed. Check your Node.js/npm installation and internet connection.
pause
