@echo off
chcp 65001 >nul
cd /d "%~dp0"

set PORT=8765
set URL=http://127.0.0.1:%PORT%/control.html

where python >nul 2>&1
if %ERRORLEVEL% equ 0 goto :run_python

where py >nul 2>&1
if %ERRORLEVEL% equ 0 goto :run_py

echo [未找到 Python]
echo 请任选其一：
echo   1. 双击「启动本地服务.bat」使用图形界面下载便携 Python
echo   2. 安装 Python 3 后再次运行本脚本
echo   3. 已安装 Node.js 时在本文件夹执行: npx --yes serve -l %PORT%
echo      然后浏览器访问 %URL%
echo.
pause
exit /b 1

:run_python
echo 歌词插件本地服务  端口 %PORT%
echo 控制页: %URL%   显示端: http://127.0.0.1:%PORT%/display.html
echo 关闭本窗口即停止服务。按 Ctrl+C 也可停止。
echo.
start "" "%URL%"
python -m http.server %PORT%
exit /b %ERRORLEVEL%

:run_py
echo 歌词插件本地服务  端口 %PORT%
echo 控制页: %URL%   显示端: http://127.0.0.1:%PORT%/display.html
echo 关闭本窗口即停止服务。按 Ctrl+C 也可停止。
echo.
start "" "%URL%"
py -3 -m http.server %PORT%
exit /b %ERRORLEVEL%
