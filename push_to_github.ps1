# KEAOS Checkpoint & GitHub Push Script
$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "KEAOS | Checkpoint, Save Everything & Push to GitHub" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Checking Git Status..." -ForegroundColor Yellow
git status -s

Write-Host ""
Write-Host "[2/3] Staging all files and creating checkpoint commit..." -ForegroundColor Yellow
git add -A
git commit -m "feat(tars-recon): complete 5-tier cascading tax reconciliation engine, schema normalizer & deterministic studio"

Write-Host ""
Write-Host "[3/3] Pushing to GitHub (origin main)..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "Checkpoint and GitHub Push Complete!" -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Green
