# NOXH VPS security operations

`backup-noxh.sh` creates a root-only, checksummed archive of the live site,
Nginx, Let's Encrypt, SSH and UFW configuration under `/var/backups/noxh`.
Copy verified backups to a separate machine or storage account; a backup kept
only on the VPS does not protect against disk or provider loss.

`disable-ssh-password.sh` refuses to run unless `noxhadmin` has an
`authorized_keys` file. Before using it, open a second connection with the
dedicated key and confirm that `sudo -n true` or an interactive `sudo` command
works. Keep the first session open until a new key-only connection succeeds.

`harden-nginx.sh` fixes the canonical `www` redirect so it never points down to
HTTP, adds a one-day HSTS trial, and adds a report-only CSP. It writes a dated
copy of the current Certbot-managed site configuration before editing and
restores that copy automatically if `nginx -t` fails.

From the repository root on Windows, upload and run the scripts with:

```powershell
scp -i "$HOME\.ssh\noxh_vps_ed25519" deploy\vps\backup-noxh.sh deploy\vps\disable-ssh-password.sh noxhadmin@116.118.3.62:~/
ssh -i "$HOME\.ssh\noxh_vps_ed25519" noxhadmin@116.118.3.62 "sudo bash ~/backup-noxh.sh"
ssh -i "$HOME\.ssh\noxh_vps_ed25519" noxhadmin@116.118.3.62 "sudo bash ~/disable-ssh-password.sh"
scp -i "$HOME\.ssh\noxh_vps_ed25519" deploy\vps\harden-nginx.sh noxhadmin@116.118.3.62:~/
ssh -tt -i "$HOME\.ssh\noxh_vps_ed25519" noxhadmin@116.118.3.62 "sudo bash ~/harden-nginx.sh"
```

The guided Windows command performs the same sequence and stops before changing
`sshd` if the key-only login check fails:

```powershell
powershell -ExecutionPolicy Bypass -File .\deploy\vps\apply-security.ps1
```

After password login is disabled, verify it from Windows:

```powershell
ssh -o BatchMode=yes -i "$HOME\.ssh\noxh_vps_ed25519" noxhadmin@116.118.3.62 "id; sudo sshd -T | grep -E 'permitrootlogin|passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication'"
```
