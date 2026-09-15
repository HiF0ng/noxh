param(
    [string]$ServerAddress = '116.118.3.62',
    [string]$AdminUser = 'noxhadmin'
)

$ErrorActionPreference = 'Stop'
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$privateKey = 'C:\Users\dungk\.ssh\noxh_vps_ed25519'
$publicKey = "$privateKey.pub"
$targetServer = "$AdminUser@$ServerAddress"

if (-not (Test-Path -LiteralPath $privateKey) -or -not (Test-Path -LiteralPath $publicKey)) {
    throw "Missing NOXH SSH key: $privateKey"
}

& ssh.exe -o BatchMode=yes -o IdentitiesOnly=yes -i $privateKey $targetServer 'exit 0' 2>$null
$keyAlreadyInstalled = $LASTEXITCODE -eq 0
if ($keyAlreadyInstalled) {
    Write-Host '1/5 Public key is already installed; skipping password authentication.' -ForegroundColor Cyan
} else {
    Write-Host '1/5 Uploading and installing the public key without changing its encoding.' -ForegroundColor Cyan
    Write-Host 'Enter the current VPS password for SCP, then enter it once more for SSH.' -ForegroundColor DarkCyan
    & scp.exe $publicKey "${targetServer}:~/noxh_vps_ed25519.pub"
    if ($LASTEXITCODE -ne 0) { throw 'Could not upload the public SSH key.' }
    & ssh.exe $targetServer 'umask 077; mkdir -p ~/.ssh; touch ~/.ssh/authorized_keys; grep -qxF -f ~/noxh_vps_ed25519.pub ~/.ssh/authorized_keys || cat ~/noxh_vps_ed25519.pub >> ~/.ssh/authorized_keys; chmod 700 ~/.ssh; chmod 600 ~/.ssh/authorized_keys; rm -f ~/noxh_vps_ed25519.pub'
    if ($LASTEXITCODE -ne 0) { throw 'Could not install the public SSH key.' }
}

Write-Host '2/5 Verifying key-only login before changing sshd.' -ForegroundColor Cyan
& ssh.exe -o BatchMode=yes -o IdentitiesOnly=yes -i $privateKey $targetServer 'printf key-login-ok'
if ($LASTEXITCODE -ne 0) { throw 'Key login failed. Password authentication was left enabled.' }

Write-Host '3/5 Uploading the reviewed backup and SSH-hardening scripts.' -ForegroundColor Cyan
& scp.exe -i $privateKey (Join-Path $PSScriptRoot 'backup-noxh.sh') (Join-Path $PSScriptRoot 'disable-ssh-password.sh') "${targetServer}:~/"
if ($LASTEXITCODE -ne 0) { throw 'Could not upload the VPS security scripts.' }

Write-Host '4/5 Creating a verified backup, then disabling password login. Enter the sudo password when prompted.' -ForegroundColor Cyan
& ssh.exe -tt -i $privateKey $targetServer 'sudo -v && sudo bash -n ~/backup-noxh.sh ~/disable-ssh-password.sh && sudo bash ~/backup-noxh.sh && sudo bash ~/disable-ssh-password.sh'
if ($LASTEXITCODE -ne 0) { throw 'VPS backup or SSH hardening failed.' }

Write-Host '5/5 Verifying key login and confirming password-only login is rejected.' -ForegroundColor Cyan
& ssh.exe -o BatchMode=yes -o IdentitiesOnly=yes -i $privateKey $targetServer 'printf key-login-ok'
if ($LASTEXITCODE -ne 0) { throw 'Key login failed after SSH reload. Keep the current VPS session open and inspect sshd.' }

& ssh.exe -o BatchMode=yes -o PreferredAuthentications=password -o PubkeyAuthentication=no $targetServer 'exit 0' 2>$null
if ($LASTEXITCODE -eq 0) { throw 'Password-only SSH login is still accepted.' }

Write-Host 'NOXH VPS backup created and SSH password login disabled successfully.' -ForegroundColor Green
