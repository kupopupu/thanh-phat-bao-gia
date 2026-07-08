<#
Deploy script for Thanh Phát Webapp
Usage:
  - From any folder: run the script file (PowerShell) e.g.
      & "F:\Game\Báo Giá Thanh Phát\Thanh Phát Webapp\deploy.ps1" -Message "mô tả thay đổi"
  - Or cd into project folder then run: .\deploy.ps1 -Message "mô tả thay đổi"

Behavior:
  - Stages all changes, commits only if there are staged changes (uses provided message or timestamp),
    then pushes to the remote (default: origin/master).
#>
param(
    [string]$Message = '',
    [string]$Remote  = 'origin',
    [string]$Branch  = 'master'
)

$ErrorActionPreference = 'Stop'

try {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
    Set-Location $scriptDir
} catch {
    Write-Error "Không thể chuyển đến thư mục script: $_"
    exit 1
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error 'git không được tìm thấy trong PATH. Vui lòng cài Git trước khi chạy script này.'
    exit 1
}

Write-Host "Working dir: $PWD"
Write-Host 'Staging all changes...'
git add -A

# Check if there's anything staged
$staged = git diff --cached --name-only
if ([string]::IsNullOrWhiteSpace($staged)) {
    Write-Host 'Không có thay đổi nào được stage (không có commit mới).'
} else {
    if ([string]::IsNullOrWhiteSpace($Message)) {
        $Message = "deploy: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    }
    Write-Host "Committing with message: $Message"
    try {
        git commit -m $Message
    } catch {
        Write-Error "Commit failed: $_"
        exit 1
    }
}

Write-Host "Pushing to $Remote/$Branch..."
try {
    git push $Remote $Branch
    Write-Host 'Push thành công.' -ForegroundColor Green
} catch {
    Write-Error "Push thất bại: $_"
    exit 1
}
