# deploy/vps — wikitours.ma on the Hostinger VPS (replaces Vercel)

The owner chose on 2026-10-14 to move off the Vercel Hobby plan. The plan had run over its free CPU (6h18 of 4h) and is not meant for commercial sites. The new host:

- **Server:** Hostinger KVM 8 `srv2062670.hstgr.cloud` (72.60.92.29), Paris: 8 vCPU, 32 GB RAM.
- **OS:** Ubuntu 24.04.
- **Site:** one Next.js server (`next start` on 127.0.0.1:3000) behind Caddy, which serves HTTPS for every hostname.
- **Data:** Supabase is unchanged, so the app is stateless. The only server-side state is `/etc/wikitours/env` and the ISR cache.

## What runs where
| Piece | On the VPS | Was on Vercel |
|---|---|---|
| Site + admin + legacy domains | `wikitours.service` (Next.js), Caddy `Caddyfile` | Vercel project `wikitours` |
| HTTPS certificates | Caddy, automatic (Let's Encrypt) | Vercel |
| Deploy on every push to `master` | `wikitours-deploy.timer`: checks GitHub every 2 min, builds in a new release, switches, health-checks, rolls back | Vercel Git integration |
| The 4 daily jobs (UTC) | `wikitours-cron-{rollup,sync-reviews,ping,publish-articles}.timer` → `wikitours-cron` (same `Bearer CRON_SECRET`) | `vercel.json` crons |
| Environment | `/etc/wikitours/env` (640 root:wikitours; names in `env.example`) | Vercel env vars (Production) |
| Logs | `journalctl -u wikitours`, `/var/log/wikitours/{deploy,cron}.log`, `/var/log/caddy/` | Vercel logs |

**Not ported:** the `x-vercel-ip-*` geo headers. Lead and visit rows get `country`, `region` and `city` = null until a GeoIP lookup is added. That is a follow-up; the code already falls back to null.

## Order (first time)
1. **Owner, in hPanel:**
   - reinstall the OS with plain Ubuntu 24.04;
   - add the SSH public key (`~/.ssh/wikitours_vps_ed25519.pub` on the owner's PC).
2. **Bootstrap.** Copy `deploy/vps` to the server, then run `bash bootstrap.sh`. It installs Node 22, Caddy in **preview** mode, the firewall (22, 80, 443), fail2ban, automatic security updates, the units and the scripts. It prints the server's GitHub deploy key.
3. **GitHub deploy key:** add that key to the repo's Deploy keys, read-only.
4. **Environment:** write `/etc/wikitours/env` with the 6 Vercel variables and `DEPLOY_ENV=production`. Use a NEW `CRON_SECRET`.
5. **First deploy:** `sudo systemctl start wikitours-deploy`, then `systemctl enable --now wikitours wikitours-deploy.timer`. Do **not** enable the cron timers yet: Vercel's crons still run, and both would hit the same database.
6. **Test before DNS:**
   - `https://srv2062670.hstgr.cloud/fr` in a browser (noindex);
   - `curl -k --resolve wikitours.ma:443:72.60.92.29 https://wikitours.ma/fr`;
   - the same for `admin.wikitours.ma` and `bab-makka.com/omra/1104/x`, which must give ONE 301 to `https://wikitours.ma/fr/bab-makka`;
   - `/api/health/seo`;
   - `wikitours-cron ping`, which is read-only.
7. **DNS cut-over:**
   - **wikitours.ma** (Heberjahiz): `@`, `www` and `admin` → A `72.60.92.29`;
   - **bab-makka.com** (Capconnect): `@`, `www` and `m` → A `72.60.92.29`;
   - remove the Vercel records (76.76.21.21, 216.198.79.1, the `*.vercel-dns*.com` CNAMEs).
8. **Switch Caddy to production:** `install -m 644 Caddyfile /etc/caddy/Caddyfile && touch /etc/caddy/.wikitours-production && systemctl reload caddy`. Caddy then fetches the real certificates.
9. **Hand the crons over** (same day, between two runs):
   1. Push a commit that removes `crons` from `vercel.json`. Vercel deploys it, which removes its crons.
   2. `systemctl enable --now wikitours-cron-{rollup,sync-reviews,ping,publish-articles}.timer`.
   3. Push `vercel.json` with `"git": {"deploymentEnabled": false}`, so pushes stop building on Vercel. Each Vercel build also ran the article ingest against the live database.
10. **Keep the Vercel project** (not deleted) for 2 weeks as a rollback: point the DNS back to Vercel.

## Every day
- **Deploy:** push to `master`. It is live about 5–10 minutes later.
  - Check: `tail /var/log/wikitours/deploy.log`.
  - A failed build never replaces the live site. It is not retried until a new commit arrives. The log is at `/srv/wikitours/releases/<sha>-<time>.build.log`.
- **Roll back:** `sudo -u wikitours wikitours-deploy --rollback`. The 3 newest releases are kept.
- **Deploy a given commit:** `sudo -u wikitours bash -c 'set -a; . /etc/wikitours/env; set +a; wikitours-deploy --ref <sha>'`.
- **Run a cron by hand:** `sudo systemctl start wikitours-cron@publish-articles`. One line per run goes to `/var/log/wikitours/cron.log`.
- **Status:**
  - `systemctl status wikitours caddy`;
  - `systemctl list-timers 'wikitours*'`.
