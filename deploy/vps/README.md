# deploy/vps — wikitours.ma on the Hostinger VPS (replaces Vercel)

The owner chose on 2026-10-14 to move off the Vercel Hobby plan. The plan had run over its free CPU (6h18 of 4h) and is not meant for commercial sites. The new host:

- **Server:** Hostinger KVM 8 `srv2062670.hstgr.cloud` (72.60.92.29), Paris: 8 vCPU, 32 GB RAM.
- **OS:** Ubuntu 24.04.
- **Site:** one Next.js server (`next start --hostname localhost --port 3000`, listening on [::1]) behind Caddy, which serves HTTPS for every hostname. Why `localhost` and not 127.0.0.1 is explained in `systemd/wikitours.service`: it keeps every redirect and the admin rewrite relative, as on Vercel.
- **Data:** Supabase is unchanged, so the app is stateless. The only server-side state is `/etc/wikitours/env` and the ISR cache.

## What runs where
| Piece | On the VPS | Was on Vercel |
|---|---|---|
| Site + admin + legacy domains | `wikitours.service` (Next.js), Caddy `Caddyfile` | Vercel project `wikitours` |
| HTTPS certificates | Caddy, automatic (Let's Encrypt) | Vercel |
| Deploy on every push to `master` | `wikitours-deploy.timer`: checks GitHub every 2 min, builds in a new release, switches, health-checks, rolls back | Vercel Git integration |
| The 4 daily jobs and the 1 January one (UTC) | `wikitours-cron-{rollup,sync-reviews,ping,publish-articles,year-tokens}.timer` → `wikitours-cron` (same `Bearer CRON_SECRET`) | `vercel.json` crons |
| Environment | `/etc/wikitours/env` (640 root:wikitours; names in `env.example`) | Vercel env vars (Production) |
| Logs | `journalctl -u wikitours`, `/var/log/wikitours/{deploy,cron}.log`, `/var/log/caddy/` | Vercel logs |

**Not ported:** the `x-vercel-ip-*` geo headers. Lead and visit rows get `country`, `region` and `city` = null until a GeoIP lookup is added. That is a follow-up; the code already falls back to null. Caddy strips any client-sent `X-Vercel-Ip-*` header, so these fields cannot be spoofed.

**Hardening:**
- Caddy runs with no admin API, so config changes need `systemctl restart caddy`.
- Request bodies are capped at 5 MB, close to Vercel's 4.5 MB. TRACE/TRACK get 405.
- The `wikitours` user has no login shell and no crontab.
- The app process can write only the live release and the shared image cache. The git mirror, the other releases and `current` are read-only for it (`ReadWritePaths` in `systemd/wikitours.service`).
- Caddy drops idle connections to the app after 4 s, before Node's 5 s, so a POST (a lead form) never lands on a connection Node is closing.
- Automatic updates also cover Node.js and Caddy, with an automatic reboot at 02:30 UTC when the kernel needs one.

## Order (first time)
1. **Owner, in hPanel:**
   - reinstall the OS with plain Ubuntu 24.04;
   - add the SSH public key (`~/.ssh/wikitours_vps_ed25519.pub` on the owner's PC).
2. **Bootstrap.** Copy `deploy/vps` **from a clean checkout of a pushed commit** (not a working tree with edits) to the server, then run `bash bootstrap.sh`. It installs Node 22, Caddy in **preview** mode (with the production Caddyfile beside it, as `/etc/caddy/Caddyfile.production`), the cut-over watch timer (step 8), the firewall (22, 80, 443 tcp+udp), fail2ban, automatic security updates, keys-only SSH, the units and the scripts. It prints the server's GitHub deploy key.
3. **GitHub deploy key:** add that key to the repo's Deploy keys, read-only.
4. **Environment:** write `/etc/wikitours/env` with the 6 Vercel variables and `DEPLOY_ENV=production`. Use a NEW `CRON_SECRET`.
5. **First deploy:** `sudo systemctl start wikitours-deploy`, then `systemctl enable --now wikitours wikitours-deploy.timer`. Do **not** enable the cron timers yet: Vercel's crons still run, and both would hit the same database.
6. **Test before DNS:**
   - `https://srv2062670.hstgr.cloud/fr` in a browser (noindex);
   - `curl -k --resolve wikitours.ma:443:72.60.92.29 https://wikitours.ma/fr` gives 200;
   - `/` gives 307 with `Location: /fr`, which is RELATIVE: no `localhost:3000` may appear in any Location;
   - `www.wikitours.ma/fr?x=1` gives 301 to `https://wikitours.ma/fr?x=1`;
   - `admin.wikitours.ma/` gives 307 with `Location: /admin/login` (not 500);
   - `bab-makka.com/omra/1104/x` gives ONE 301 to `https://wikitours.ma/fr/bab-makka`;
   - `/sitemap.xml`, `/robots.txt` and `/llms.txt` give 200;
   - `/api/health/seo` gives **503** on BOTH Vercel and the VPS today. That is a content gap, not a hosting one: `settings.verification_metas` is empty. Compare it with Vercel, don't expect 200;
   - `/api/ping` WITHOUT the secret gives 401;
   - `sudo systemctl start wikitours-cron@ping` logs `HTTP 200` in `/var/log/wikitours/cron.log`. It is a read-only database keep-alive.
7. **DNS cut-over.** These records were measured on 2026-10-14. Keep the **MX** (`dm.heberjahiz.com`, the e-mail) and the Google **TXT** untouched.
   - **wikitours.ma** (Heberjahiz, TTL 7200):
     - `@` A 76.76.21.21 → `72.60.92.29`;
     - `www` CNAME `cname.vercel-dns.com` → A `72.60.92.29`;
     - `admin` CNAME `cname.vercel-dns.com` → A `72.60.92.29`.
   - **bab-makka.com** (Cap Connect, NOT in the owner's own Cap Connect account; TTL 3600 / 14400):
     - `@` A 76.76.21.21 + 216.198.79.1 → one A `72.60.92.29`;
     - `www` and `m` CNAME `…vercel-dns-017.com` → A `72.60.92.29`.
     - It only redirects, and Vercel keeps answering it until it moves. The production Caddyfile keeps these 3 hosts on `tls internal` until then. After their DNS moves, delete that line in `deploy/vps/Caddyfile`, push, and install the kit again ("Kit updates" below). An edit made only on the server is undone by the next bootstrap run.
   - **The swap:**
     - Change a CNAME into an A record in place, or add the A right before deleting the CNAME. A gap gets cached as "does not exist" (the SOA minimum is 7200 s here, 86400 s at Cap Connect).
     - Do NOT add AAAA records: IPv6 to 80/443 was never tested from outside.
     - Use a low-traffic hour.
8. **Switch Caddy to production RIGHT AFTER the authoritative DNS answers the new IP.** The server does it by itself: `wikitours-cutover-watch.timer` asks both Heberjahiz servers every minute and runs `wikitours-cutover caddy` as soon as both answer 72.60.92.29 for `@`, `www` and `admin`. So the DNS change can be made at any time, with nobody watching.
   - It makes ONE attempt, then the timer disables itself. Each change in the DNS answers, the attempt and its result go to `/var/log/wikitours/cutover.log`.
   - By hand (or after a failed attempt): `wikitours-cutover check` shows what BOTH servers (dmns1, dmns2) answer, their SOA serials and which Caddy config runs. `wikitours-cutover caddy` refuses until both answer 72.60.92.29 for the 3 names. It then:
      - validates the production Caddyfile as the `caddy` user;
      - restarts Caddy, and restores the previous config if it does not start;
      - waits until each host serves a publicly trusted certificate (checked without `-k`).
   - The production Caddyfile is the copy the last bootstrap run installed (`/etc/caddy/Caddyfile.production`), never an older kit.
   - **New records:** give them a short TTL (300 s) for the first days, so a rollback to Vercel spreads in minutes rather than hours. Raise it to 3600 once stable.
   - **Why the order:** Let's Encrypt validates against the authoritative DNS. Switching earlier makes the issuance fail and back off. Between the DNS change and the issuance, a visitor whose resolver already sees the VPS gets the internal certificate. The old TTLs (2 h) keep almost everyone on Vercel during those seconds.
   - **Between DNS and step 9.3,** every push is built by BOTH Vercel and the VPS. The prebuild ingest is idempotent (it skips articles already ingested), but keep that window short.
9. **Hand the crons over** (same day, between **09:00 and 03:00 UTC**). Vercel Hobby runs each cron at some minute within its hour (08:00 → 08:00–08:59), and the jobs run at 03:30, 05:00, 06:00 and 08:00. In that window no job is due on either side:
   1. Push a commit that removes `crons` from `vercel.json`. Vercel deploys it, which removes its crons. **Confirm it before step 2:** the Vercel production deployment of that commit is "Ready", and Project → Settings → Cron Jobs lists none. Otherwise every job would run twice.
   2. `systemctl enable --now wikitours-cron-{rollup,sync-reviews,ping,publish-articles,year-tokens}.timer` (`year-tokens` fires only on 1 January at 00:05 UTC).
   3. Push `vercel.json` with `"git": {"deploymentEnabled": false}`, so pushes stop building on Vercel. Each Vercel build also ran the article ingest against the live database.
10. **Keep the Vercel project** (not deleted) for 2 weeks as a rollback.
   - **Rollback before step 9:**
     1. In the Vercel dashboard, Redeploy the latest production deployment first. After the switch, admin edits revalidate only the VPS, so Vercel's static pages (revalidate=false) would show pre-switch content.
     2. Point the 3 records back: `@` A 76.76.21.21, and `www` and `admin` CNAME `cname.vercel-dns.com`.
   - **Rollback after step 9:**
     1. `systemctl disable --now wikitours-cron-*.timer` on the VPS.
     2. Revert both vercel.json commits in ONE push. Vercel cannot build that push (deployments are off), so redeploy it from the Vercel dashboard: Deployments → the latest → Redeploy. That brings its crons and Git builds back.
     3. Point the DNS back as above.
   - **Risk:** if Vercel pauses the Hobby project for over-use, this rollback target is gone. Then the VPS is the only host; restore from its 3 kept releases.
11. **During the split window** (up to the old TTL, 2 h, after the DNS change): no admin edits (prices above all), because a write revalidates only the host that receives it. Also no pushes.
12. **Right after the switch:**
    - one admin login (the owner);
    - `curl https://wikitours.ma/api/lead` with a GET or an empty POST, which must answer 4xx and never insert;
    - the outside monitor: `.github/workflows/uptime.yml` runs hourly. A failure e-mails the repo owner.

## Every day
- **Deploy:** push to `master`. The timer notices within 2 minutes, and a build takes about 30 seconds on this machine.
  1. **Build:** `npm ci` and `npm run build`, including the postbuild SEO suite and the tests.
  2. **Smoke test:** the new release starts on port 3001 and must serve `/fr` with 200. Only then does it replace the live one.
  3. **Health check:** after the restart. On failure it switches back by itself.
  - **Failures:** a failed build or smoke test never replaces the live site, and that commit is not retried until a new one arrives. Its log is `/srv/wikitours/releases/<sha>-<time>.build.log`.
  - **Interruptions:** a build stopped halfway (reboot, `systemctl stop`, timeout) deletes its half-built release. If a deploy is stopped between the switch and the health check, the next timer run does the check. If the release answers 200, it is marked good. If not, the timer switches back, as an uninterrupted deploy would have.
  - **Check:** `tail /var/log/wikitours/deploy.log`.
- **Manual commands** run with exactly the timer's environment:
  `sudo systemd-run --uid=wikitours --gid=wikitours -p EnvironmentFile=/etc/wikitours/env -p Environment=NEXT_TELEMETRY_DISABLED=1 -p Nice=5 --wait --pipe /usr/local/bin/wikitours-deploy <flag>`
  - `--rollback`: back to the healthy release that was live before this one. Run it again to step further back. It sets a **HOLD**, so the timer does not redeploy master over it. The release you left is never a rollback target again (deploy it with `--ref` if you want it back). If the target does not answer within 90 s, the release you left is put back.
  - `--ref <sha>`: deploy a given commit. It also sets a HOLD.
  - `--resume`: clear the HOLD. The timer deploys master again.
  - `(no flag)`: rebuild and deploy master now.
  - The 3 newest releases are kept. `.good` is the live history: the releases that went live and passed the health check, oldest first. A rollback cuts it back to its target.
- **Kit updates** (a pushed change under `deploy/vps`): a deploy does not install them. On the server, as root, with the pushed commit's sha:
  `K=/root/kit-<sha>; mkdir -p $K && git -c safe.directory=/srv/wikitours/repo.git -C /srv/wikitours/repo.git archive <sha> deploy/vps | tar -x -C $K && bash $K/deploy/vps/bootstrap.sh`
  It is safe to re-run. After the cut-over it also makes the new production Caddyfile live (validated first; the previous one comes back if Caddy does not start).
- **Run a cron by hand:** `sudo systemctl start wikitours-cron@publish-articles`. One line per run goes to `/var/log/wikitours/cron.log`. The secret goes to curl through stdin, never its command line. A run first waits up to 1 minute for the app to answer, so a run caught up at boot is not lost.
- **Status:**
  - `systemctl status wikitours caddy`;
  - `systemctl list-timers 'wikitours*'`.
