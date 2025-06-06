@echo off
setlocal enabledelayedexpansion

:: Get local IP and subnet
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
    set "ip=%%a"
)
set "ip=%ip:~1%"
for /f "tokens=1-3 delims=." %%a in ("%ip%") do (
    set "subnet=%%a.%%b.%%c"
)

echo Scanning network: %subnet%.0/24
echo -----------------------------------

for /l %%i in (1,1,254) do (
    ping -n 1 -w 10 %subnet%.%%i >nul
    if !errorlevel! == 0 (
        echo %subnet%.%%i is up
    )
)

echo -----------------------------------
echo Scan complete.
pause
