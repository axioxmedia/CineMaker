@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo.
echo === CineMaker : build EXE ===
echo.

set "PY="
where py >nul 2>&1 && set "PY=py -3"
if not defined PY where python >nul 2>&1 && set "PY=python"
if not defined PY where python3 >nul 2>&1 && set "PY=python3"

if not defined PY (
  echo [ERROR] Python was not found.
  pause
  exit /b 1
)

taskkill /F /IM CineMaker.exe >nul 2>&1
set "VPY=.venv\Scripts\python.exe"
if not exist "%VPY%" %PY% -m venv .venv
"%VPY%" -m pip install -U pip
"%VPY%" -m pip install -r requirements.txt -r requirements-build.txt
"%VPY%" -m PyInstaller --noconfirm --clean CineMaker.spec
echo EXE: "%cd%\dist\CineMaker.exe"
pause
