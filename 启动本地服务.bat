<<<<<<< HEAD
@echo off
chcp 65001 >nul
cd /d "%~dp0"
REM 图形界面：检测环境、可选下载便携 Python、启停服务
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Sta -File "%~dp0Launcher.ps1"
if errorlevel 1 (
  echo.
  echo GUI launcher failed. Falling back to CLI mode...
  echo.
  call "%~dp0启动本地服务-命令行.bat"
  exit /b %ERRORLEVEL%
)
exit /b 0
=======
@echo off
chcp 65001 >nul
cd /d "%~dp0"
REM 图形界面：检测环境、可选下载便携 Python、启停服务
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -Sta -File "%~dp0Launcher.ps1"
if errorlevel 1 (
  echo.
  echo GUI launcher failed. Falling back to CLI mode...
  echo.
  call "%~dp0启动本地服务-命令行.bat"
  exit /b %ERRORLEVEL%
)
exit /b 0
>>>>>>> ce06bf7e3ef514af1e39fdb9769e4f30278f895d
