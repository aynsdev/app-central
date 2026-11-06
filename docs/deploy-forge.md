# Deploying on Laravel Forge

Forge runs Next.js sites with PM2 (`next start`) behind Nginx. App Central
works with Forge's defaults; you only add a database, environment variables
and one migration line. Replace `app.example.com` with your domain below.

## 1. Server

Create a server with **PostgreSQL** as the database and **Node 22** or newer.

## 2. Site and database

**Server → Sites → New site**

- Domain: `app.example.com`
- Project type: **Next.js**
- Repository: `aynsdev/app-central` (or your fork), branch `main`
- Have Forge create a database (for example `app_central`)

## 3. Environment

**Site → Environment**. Forge creates `.env` from `.env.example` and fills in
the database settings. Check that it looks like this:

```dotenv
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=app_central
DB_USERNAME=forge
DB_PASSWORD=<filled in by Forge>

APP_URL=https://app.example.com
CRON_SECRET=<output of: openssl rand -hex 24>
```

`DATABASE_URL` also works and takes precedence over the `DB_*` settings.
The `.env` is shared into every release automatically.

## 4. Deploy script

**Site → Deployments → Deploy script**. Keep what Forge generated and add
`npm run db:migrate` after the build:

```bash
$CREATE_RELEASE()

cd $FORGE_RELEASE_DIRECTORY

npm ci || npm install
npm run build
npm run db:migrate

$ACTIVATE_RELEASE()

# ...Forge's PM2 block stays as generated (pm2 start ... || pm2 reload ...)
```

Migrations run before the new release goes live, so if the build or a
migration fails, the previous release keeps serving.

Forge starts the app in PM2 cluster mode with one worker per CPU core. Each
worker opens up to 10 database connections. On a big server, lower that with
`DATABASE_POOL_SIZE=5` in `.env` so you stay under Postgres's default limit of
100 connections.

The build needs about 1.5 GB of memory. On a 1 GB server, add swap first
(`sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`,
then add it to `/etc/fstab`).

Click **Deploy now**, and turn on **Push to deploy** if you want deploys on
every push to `main`.

## 5. SSL and first login

**Site → SSL → Let's Encrypt**. Then open `https://app.example.com/setup` and
create the admin account. The setup page only works while no admin exists.

## 6. Weekly reports

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

Turn on **Database backups** for the database. Everything, including project
logos, is stored in Postgres.

## Troubleshooting

- **502 Bad Gateway**: the app isn't running. SSH in and run `pm2 status` and
  `pm2 logs`.
- **`Database is not configured`** during deploy: `.env` has no `DB_*` or
  `DATABASE_URL`. Fill it in under **Site → Environment** and redeploy.
- **`ECONNREFUSED 127.0.0.1:<port>`** during `db:migrate`: `DB_PORT` (or
  `DB_HOST`) is wrong. Forge's Postgres listens on `5432`.
- **Changed `.env` but nothing happened**: redeploy, or run
  `pm2 reload all --update-env` over SSH.
