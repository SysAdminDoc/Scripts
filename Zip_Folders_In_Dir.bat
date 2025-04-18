@echo off
setlocal enabledelayedexpansion

REM Set your target directory
set "sourceDir=D:\Design Files\Templates, Audio, SFX, Graphics"

REM Set the path to 7za.exe or 7z.exe if not in PATH
set "zipExe=C:\Program Files\7-Zip\7z.exe"

REM Change to source directory
pushd "%sourceDir%"

REM Loop through each folder
for /d %%i in (*) do (
    "%zipExe%" a "%%i.7z" "%%i\"
)

popd

echo Done!
pause
