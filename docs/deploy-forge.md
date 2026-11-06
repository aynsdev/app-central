# Deploying on Laravel Forge

App Central builds to a self-contained Node server (`output: "standalone"`).
On Forge it runs as a **Background Process** (Supervisor) behind Nginx, with
PostgreSQL on the same server. Replace `app.example.com` with your domain
everywhere below.

## 1. Server

Create a server (App server is fine) and pick **PostgreSQL** as the database
and **Node 22** or newer. On an existing server, check with `node -v` over SSH
and install Postgres from **Databases** if it isn't there.

## 2. Database

**Server → Databases → Create database**

- Database: `appcentral`
- User: `appcentral`, with a generated password

Your connection string becomes:

```
postgres://appcentral:<password>@127.0.0.1:5432/appcentral
```

URL-encode the password if it contains `@ : / ? #` characters.

## 3. Site

**Server → Sites → New site**

- Domain: `app.example.com`
- Project type: **Next.js**
- Repository: `aynsdev/app-central` (or your fork), branch `main`
- Leave "Install Composer dependencies" off; it's not a PHP app

Forge sets up Nginx to proxy to `127.0.0.1:3000`. If you run more than one Node
app on the server, give each its own port and change the Nginx config
(**Site → Nginx**) to match.

## 4. Environment

**Site → Environment**. Forge copies `.env.example` on creation; replace it with:

```dotenv
DATABASE_URL=postgres://appcentral:<password>@127.0.0.1:5432/appcentral
APP_URL=https://app.example.com
CRON_SECRET=<output of: openssl rand -hex 24>
NODE_ENV=production
```

The `.env` file lives at `/home/forge/app.example.com/.env` and is shared into
every release automatically.

## 5. Background process

**Server → Background processes → New** (the server-level one, not the site one,
if you see both):

| Field | Value |
| --- | --- |
| Command | `/usr/bin/env PORT=3000 HOSTNAME=127.0.0.1 node --env-file=/home/forge/app.example.com/.env .next/standalone/server.js` |
| Directory | `/home/forge/app.example.com/current` |
| User | `forge` |
| Processes | 1 |

`HOSTNAME=127.0.0.1` keeps the app reachable only through Nginx. Note the
process **ID** Forge shows (for example `65654`); the deploy script restarts it.

It will crash-loop until the first deploy finishes. That's expected.

## 6. Deploy script

**Site → Deployments → Deploy script**:

```bash
$CREATE_RELEASE()

cd $FORGE_RELEASE_DIRECTORY

npm ci --no-audit --no-fund
npm run build

# The standalone server doesn't include static assets; copy them in.
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# Apply pending SQL migrations before the new release goes live.
node --env-file=.env scripts/migrate.mjs

$ACTIVATE_RELEASE()

sudo -S supervisorctl restart daemon-65654:*
```

Swap `65654` for your background process ID. If the build or a migration
fails, the previous release keeps serving.

The build needs about 1.5 GB of memory. On a 1 GB server, add swap first
(`sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`,
then add it to `/etc/fstab`).

Click **Deploy now**, and turn on **Push to deploy** if you want deploys on every push to `main`.

## 7. SSL

**Site → SSL → Let's Encrypt**. Once it's active, open
`https://app.example.com/setup` and create the admin account. The setup page
only works while no admin exists.

## 8. Weekly reports

**Server → Scheduler → New job**:

- Frequency: Weekly (or a custom cron such as `0 8 * * 1` for Mondays at 08:00)
- User: `forge`
- Command:

```bash
curl -fsS -X POST https://app.example.com/api/cron/reports -H "Authorization: Bearer <CRON_SECRET>"
```

Each project with a report webhook set in **Settings → Weekly reports** gets
its report posted.

## Backups

Turn on **Database backups** for `appcentral` (S3, DigitalOcean Spaces, etc.).
Everything, including project logos, is stored in Postgres.

## Troubleshooting

- **502 Bad Gateway**: the process isn't running. Check
  **Background processes → Logs**, or `sudo supervisorctl status` over SSH.
- **`DATABASE_URL is not set`** during deploy: the shared `.env` is empty or
  missing. Fill it in under **Site → Environment** and redeploy.
- **Changed `.env` but nothing happened**: restart the background process.
  Env changes don't need a rebuild.
- **Port 3000 already in use**: another Node site owns it. Pick a new port in
  both the process command and the site's Nginx config.
