@echo off
setlocal EnableExtensions
cd /d "%~dp0.."
if /I "%CINEMAKER_SILENT%"=="1" set "SILENT=1"
echo.
echo === CineMaker : build EXE ===
echo.
set "PY="
where py >nul 2>&1 && set "PY=py -3"
if not defined PY where python >nul 2>&1 && set "PY=python"
if not defined PY where python3 >nul 2>&1 && set "PY=python3"
if not defined PY (
  echo [ERROR] Python was not found.
  if not defined SILENT pause
  exit /b 1
)
echo Using: %PY%
%PY% -c "import sys; print(sys.version)"
if not exist ".venv\Scripts\python.exe" %PY% -m venv .venv
taskkill /F /IM CineMaker.exe >nul 2>&1
set "VPY=.venv\Scripts\python.exe"
"%VPY%" -m pip install -U pip
"%VPY%" -m pip install -r requirements.txt
"%VPY%" -m pip install -r build\requirements-build.txt
if errorlevel 1 (
  echo [ERROR] pip install failed.
  if not defined SILENT pause
  exit /b 1
)
"%VPY%" -c "from engine.aio_logo import write_build_icon; write_build_icon(r'build\\icon.ico')"
echo Building EXE ...
"%VPY%" -m PyInstaller --noconfirm --clean build\CineMaker.spec
if errorlevel 1 (
  echo [ERROR] PyInstaller failed.
  if not defined SILENT pause
  exit /b 1
)
echo OK
echo EXE: "%cd%\dist\CineMaker.exe"
if not defined SILENT if exist "dist\CineMaker.exe" explorer dist
if not defined SILENT pause
