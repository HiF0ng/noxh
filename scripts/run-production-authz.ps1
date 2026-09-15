$ErrorActionPreference = 'Stop'

$nodeCommand = Get-Command node -ErrorAction SilentlyContinue
$nodePath = if ($nodeCommand) {
    $nodeCommand.Source
} else {
    Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
}
if (-not (Test-Path -LiteralPath $nodePath -PathType Leaf)) {
    throw 'Node.js was not found. Open this project in Codex once or install Node.js, then run the test again.'
}

function Read-PlainPassword([string]$Label) {
    $secure = Read-Host "$Label password" -AsSecureString
    $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
    finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

$env:NOXH_USER_A_EMAIL = Read-Host 'User A email'
$env:NOXH_USER_A_PASSWORD = Read-PlainPassword 'User A'
$env:NOXH_USER_B_EMAIL = Read-Host 'User B email'
$env:NOXH_USER_B_PASSWORD = Read-PlainPassword 'User B'
$env:NOXH_ADMIN_EMAIL = Read-Host 'Admin email'
$env:NOXH_ADMIN_PASSWORD = Read-PlainPassword 'Admin'

try {
    & $nodePath (Join-Path $PSScriptRoot 'verify-production-authz.mjs')
    if ($LASTEXITCODE -ne 0) { throw "Authorization matrix failed with exit code $LASTEXITCODE." }
} finally {
    'NOXH_USER_A_EMAIL', 'NOXH_USER_A_PASSWORD', 'NOXH_USER_B_EMAIL', 'NOXH_USER_B_PASSWORD', 'NOXH_ADMIN_EMAIL', 'NOXH_ADMIN_PASSWORD' |
        ForEach-Object { Remove-Item "Env:$_" -ErrorAction SilentlyContinue }
}
