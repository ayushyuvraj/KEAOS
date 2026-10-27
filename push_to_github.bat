@echo off
echo ======================================================================
echo KEAOS ^| Checkpoint, Save Everything ^& Push to GitHub
echo ======================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Git Status...
git status -s

echo.
echo [2/3] Staging all files and creating checkpoint commit...
git add -A
git commit -m "feat(tars-recon): complete 5-tier cascading tax reconciliation engine, schema normalizer & deterministic studio"

echo.
echo [3/3] Pushing to GitHub (origin main)...
git push origin main

echo.
echo ======================================================================
echo Checkpoint and GitHub Push Complete!
echo ======================================================================
pause
