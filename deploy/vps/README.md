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
2. **Bootstrap.** Copy `deploy/vps` **from a clean checkout of a pushed commit** (not a working tree with edits) to the server, then run `bash bootstrap.sh`. It installs Node 22, Caddy in **preview** mode, the firewall (22, 80, 443 tcp+udp), fail2ban, automatic security updates, keys-only SSH, the units and the scripts. It prints the server's GitHub deploy key.
3. **GitHub deploy key:** add that key to the repo's Deploy keys, read-only.
4. **Environment:** write `/etc/wikitours/env` with the 6 Vercel variables and `DEPLOY_ENV=production`. Use a NEW `CRON_SECRET`.
5. **First deploy:** `sudo systemctl start wikitours-deploy`, then `systemctl enable --now wikitours wikitours-deploy.timer`. Do **not** enable the cron timers yet: Vercel's crons still run, and both would hit the same database.
6. **Test before DNS:**
   - `https://srv2062670.hstgr.cloud/fr` in a browser (noindex);
   - `curl -k --resolve wikitours.ma:443:72.60.92.29 https://wikitours.ma/fr`;
   - the same for `admin.wikitours.ma` and `bab-makka.com/omra/1104/x`, which must give ONE 301 to `https://wikitours.ma/fr/bab-makka`;
   - `/api/health/seo`;
   - `wikitours-cron ping`, which is read-only.
7. **DNS cut-over.** These records were measured on 2026-10-14. Keep the **MX** (`dm.heberjahiz.com`, the e-mail) and the Google **TXT** untouched.
   - **wikitours.ma** (Heberjahiz, TTL 7200):
     - `@` A 76.76.21.21 → `72.60.92.29`;
     - `www` CNAME `cname.vercel-dns.com` → A `72.60.92.29`;
     - `admin` CNAME `cname.vercel-dns.com` → A `72.60.92.29`.
   - **bab-makka.com** (Cap Connect, NOT in the owner's own Cap Connect account; TTL 3600 / 14400):
     - `@` A 76.76.21.21 + 216.198.79.1 → one A `72.60.92.29`;
     - `www` and `m` CNAME `…vercel-dns-017.com` → A `72.60.92.29`.
     - It only redirects, and Vercel keeps answering it until it moves.
8. **Switch Caddy to production RIGHT AFTER the authoritative DNS answers the new IP.** Check with `dig +short wikitours.ma @dmns1.heberjahiz.com`, then run `install -m 644 Caddyfile /etc/caddy/Caddyfile && touch /etc/caddy/.wikitours-production && systemctl reload caddy`. Caddy then fetches the Let's Encrypt certificates in seconds.
   - **Why the order:** Let's Encrypt validates against the authoritative DNS. Switching earlier makes the issuance fail and back off. Between the DNS change and the issuance, a visitor whose resolver already sees the VPS gets the internal certificate. The old TTLs (2 h) keep almost everyone on Vercel during those seconds.
   - **Between DNS and step 9.3,** every push is built by BOTH Vercel and the VPS. The prebuild ingest is idempotent (it skips articles already ingested), but keep that window short.
9. **Hand the crons over** (same day, between two runs):
   1. Push a commit that removes `crons` from `vercel.json`. Vercel deploys it, which removes its crons.
   2. `systemctl enable --now wikitours-cron-{rollup,sync-reviews,ping,publish-articles}.timer`.
   3. Push `vercel.json` with `"git": {"deploymentEnabled": false}`, so pushes stop building on Vercel. Each Vercel build also ran the article ingest against the live database.
10. **Keep the Vercel project** (not deleted) for 2 weeks as a rollback: point the DNS back to Vercel.

## Every day
- **Deploy:** push to `master`. The timer notices within 2 minutes, and a build takes about 30 seconds on this machine.
  1. **Build:** `npm ci` and `npm run build`, including the postbuild SEO suite and the tests.
  2. **Smoke test:** the new release starts on port 3001 and must serve `/fr` with 200. Only then does it replace the live one.
  3. **Health check:** after the restart. On failure it switches back by itself.
  - **Failures:** a failed build or smoke test never replaces the live site, and that commit is not retried until a new one arrives. Its log is `/srv/wikitours/releases/<sha>-<time>.build.log`.
  - **Check:** `tail /var/log/wikitours/deploy.log`.
- **Manual commands** run with exactly the timer's environment:
  `sudo systemd-run --uid=wikitours --gid=wikitours -p EnvironmentFile=/etc/wikitours/env --wait --pipe /usr/local/bin/wikitours-deploy <flag>`
  - `--rollback`: back to the healthy release that was live before this one. Run it again to step further back. It sets a **HOLD**, so the timer does not redeploy master over it.
  - `--ref <sha>`: deploy a given commit. It also sets a HOLD.
  - `--resume`: clear the HOLD. The timer deploys master again.
  - `(no flag)`: rebuild and deploy master now.
  - The 3 newest releases are kept; `.good` lists those that went live healthy.
- **Run a cron by hand:** `sudo systemctl start wikitours-cron@publish-articles`. One line per run goes to `/var/log/wikitours/cron.log`. The secret goes to curl through stdin, never its command line.
- **Status:**
  - `systemctl status wikitours caddy`;
  - `systemctl list-timers 'wikitours*'`.
