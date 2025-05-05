@echo off
setlocal enabledelayedexpansion

:: ============================================================================
:: Network IP Scanner Batch Script (Fixed Range - Output to C:\)
:: Description: Scans the FIXED network range 192.168.1.1 to 192.168.1.254
::              using ping and saves active IPs to C:\.
:: Date Created: 2025-05-05 (Based on context)
:: !! WARNING !! : This script saves output to C:\ and REQUIRES running as Administrator.
:: ============================================================================

:: --- Configuration ---
REM This script is hardcoded to scan the 192.168.1.x network.
set "NETWORK_PREFIX=192.168.1"

REM Set the timeout for each ping in milliseconds (e.g., 500 = 0.5 seconds)
set "PING_TIMEOUT=500"

REM Set the output filename
set "OUTPUT_FILENAME=active_ips_192_168_1_scan.txt"

REM --- Set Output Path ---
REM !! WARNING !! Saving directly to C:\ root requires Administrator privileges!
REM The script will likely fail with "Access Denied" if not run as Administrator.
set "OUTPUT_FILE=C:\%OUTPUT_FILENAME%"
:: --- End Configuration ---


:: --- Setup ---
echo [*] This script will scan the fixed network range: %NETWORK_PREFIX%.1 to %NETWORK_PREFIX%.254
echo [!] WARNING: Output will be saved to %OUTPUT_FILE%
echo [!] This requires the script to be RUN AS ADMINISTRATOR.
echo.

echo [*] Starting network scan...
echo [*] This will take several minutes. Please wait.
echo.

:: Create or overwrite the output file with a header
echo # Network Scan Results (Batch Script - Fixed Range Scan) > "%OUTPUT_FILE%" || (
    echo [!!!] ERROR: Could not write to %OUTPUT_FILE%. Access denied or path invalid.
    echo [!!!] Please ensure you are running this script as Administrator.
    goto :eof
)
echo # Scan initiated: %DATE% %TIME% >> "%OUTPUT_FILE%"
echo # Location Context: Kettering, Ohio, United States >> "%OUTPUT_FILE%"
echo # Hardcoded Scan Target Range: %NETWORK_PREFIX%.1 - %NETWORK_PREFIX%.254 >> "%OUTPUT_FILE%"
echo #---------------------------------------- >> "%OUTPUT_FILE%"


:: --- Main Scanning Loop ---
set "FOUND_COUNT=0"
echo [*] Pinging addresses (%NETWORK_PREFIX%.1 to %NETWORK_PREFIX%.254)...
for /L %%i in (1,1,254) do (
    REM Construct the IP to ping for this iteration
    set "CURRENT_IP_TO_PING=!NETWORK_PREFIX!.%%i"

    REM Ping the IP address: -n 1 (one ping), -w TIMEOUT (wait milliseconds)
    REM Redirect ping command output to nul to keep console tidy.
    ping -n 1 -w %PING_TIMEOUT% !CURRENT_IP_TO_PING! > nul

    REM Check the result (ERRORLEVEL 0 means success)
    if !errorlevel! equ 0 (
        echo Found Active IP: !CURRENT_IP_TO_PING!
        REM Append found IP to the output file
        echo !CURRENT_IP_TO_PING! >> "%OUTPUT_FILE%"
        set /a FOUND_COUNT+=1
    ) else (
        REM Optional: Display progress dots for non-responsive IPs
         <nul set /p =.
    )
)

:: --- Completion ---
:eof
echo.
echo ========================================
echo [*] Network scan complete for the %NETWORK_PREFIX%.x range.
if exist "%OUTPUT_FILE%" (
    echo [*] Found %FOUND_COUNT% active IP address(es).
    echo [*] Results saved to %OUTPUT_FILE%
) else (
    echo [!] Output file %OUTPUT_FILE% was not created successfully. Check permissions/path.
)
echo ========================================
echo.

endlocal
pause