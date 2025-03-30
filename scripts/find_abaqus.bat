@echo off
set "ABAQUS_SEARCH_PATHS=C:\SIMULIA\Commands;D:\SIMULIA\Commands;C:\Program Files\SIMULIA\Commands"

for %%p in (%ABAQUS_SEARCH_PATHS%) do (
    if exist "%%p\abaqus.bat" (
        echo Found Abaqus at: %%p\abaqus.bat
        exit /b 0
    )
)

echo Abaqus not found in common locations.
echo Please update the path in server.js with your Abaqus installation path.
exit /b 1
