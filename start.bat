@echo off
REM ---------------------------------------------------------------------------
REM  Nogalix en local : un seul serveur (site + API) sur http://localhost:8010
REM
REM    start.bat          installe si besoin, compile le site s'il ne l'est pas, demarre
REM    start.bat build    recompile le site avant de demarrer (apres une modif du frontend)
REM
REM  Prerequis : Python 3.11+, Node.js 20+ (pour compiler le site), MySQL demarre
REM  (base configuree dans backend\.env).
REM ---------------------------------------------------------------------------
setlocal
cd /d "%~dp0"

if not exist "backend\.env" (
    echo backend\.env introuvable : copiez backend\.env.example en backend\.env puis renseignez-le.
    goto :error
)

REM 1. Environnement Python
if not exist "backend\.venv\Scripts\python.exe" (
    echo Installation de l'environnement Python...
    python -m venv backend\.venv || goto :error
    "backend\.venv\Scripts\python.exe" -m pip install --upgrade pip >nul
    "backend\.venv\Scripts\python.exe" -m pip install -r backend\requirements.txt || goto :error
)

REM 2. Site compile (frontend\dist)
set "NEED_BUILD="
if /i "%~1"=="build" set "NEED_BUILD=1"
if not exist "frontend\dist\index.html" set "NEED_BUILD=1"
if defined NEED_BUILD (
    if not exist "frontend\node_modules" (
        echo Installation des dependances du site...
        pushd frontend
        call npm install || (popd & goto :error)
        popd
    )
    echo Compilation du site...
    REM Configuration publique (backend\.env) utilisee pour pre-rendre les pages.
    pushd backend
    "%~dp0backend\.venv\Scripts\python.exe" -m app.web.public_config "%~dp0frontend\.prerender-config.json" || (popd & goto :error)
    popd
    pushd frontend
    call npm run build || (popd & goto :error)
    popd
)

REM 3. Migrations de la base (sans effet si elle est a jour)
pushd backend
"%~dp0backend\.venv\Scripts\python.exe" -m alembic upgrade head || (popd & goto :error)

REM 4. Serveur
echo.
echo Nogalix : http://localhost:8010
start "" "http://localhost:8010"
"%~dp0backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8010
popd
goto :eof

:error
echo.
echo Echec du demarrage. Verifiez les messages ci-dessus.
pause
exit /b 1
