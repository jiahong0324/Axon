@echo off
setlocal
cd /d "%~dp0"
title Axon Manager Function Deploy

echo.
echo Axon Manager Function Deploy
echo ============================
echo.
echo This window will stay open so you can read any message.
echo Project folder: %cd%
echo.
pause

where supabase >nul 2>nul
if errorlevel 1 (
  echo Supabase CLI is not installed.
  echo Installing it now with npm...
  call npm install -g supabase
  if errorlevel 1 (
    echo.
    echo Install failed. Please open PowerShell as Administrator and run:
    echo npm install -g supabase
    pause
    exit /b 1
  )
)

echo.
echo Logging in to Supabase. A browser window may open.
call supabase login
if errorlevel 1 (
  echo.
  echo Login failed or was cancelled.
  pause
  exit /b 1
)

echo.
set /p PROJECT_REF=Paste your Supabase project ref:
if "%PROJECT_REF%"=="" (
  echo Project ref is required.
  pause
  exit /b 1
)

echo.
echo Linking project...
call supabase link --project-ref %PROJECT_REF%
if errorlevel 1 (
  echo.
  echo Project link failed.
  pause
  exit /b 1
)

echo.
echo Deploying manage-student Edge Function...
call supabase functions deploy manage-student --no-verify-jwt
if errorlevel 1 (
  echo.
  echo Deploy failed.
  pause
  exit /b 1
)

echo.
echo Done. The manage-student function is deployed.
echo.
echo Final manual step:
echo In Supabase Dashboard, add Edge Function secret:
echo SERVICE_ROLE_KEY = your service_role key
echo.
pause
