# Clubhouse Office — Admin ng CamSur Uptown Golf

Dito makikita ang bawat tee time na na-reserve sa `/golf/book`, nag-book ng
bahay sa Villa Del Rey, nag-request ng call back, nag-subscribe sa newsletter,
at nag-sign up bilang miyembro. May login — walang mabubuksan na pahina o
API nang hindi naka-login. Gumagana sa computer na ito at online (Vercel).

Next.js 16 (App Router) + TypeScript.

## Patakbuhin

```bash
npm install      # unang beses lang
npm run dev
```

Tapos buksan ang <http://localhost:4000>. Sa unang bukas, gagawa ka ng unang
admin account.

O sa VS Code: **Run and Debug → "Admin dashboard"**.

## Istruktura

```
src/
  app/
    login/               ← sign in / unang setup
    (dashboard)/         ← lahat ng pahina para sa naka-login
      page.tsx           ← Overview
      tee-times/ bookings/ callbacks/ newsletter/ members/
    api/                 ← login, setup, logout, data, [kind]/[id] (status)
  components/            ← Sidebar, Overview, ListView, Drawer, …
  lib/
    db.ts                ← Turso, o ang mga lokal na SQLite file
    site-db.ts           ← binabasa ang datos ng site
    auth.ts              ← admin accounts at session
  proxy.ts               ← login muna; harang sa cross-site na POST/PATCH
scripts/reset-password.ts
```

## Saan kinukuha ang datos

**May `TURSO_DATABASE_URL` (sa `.env.local`, o sa Vercel):** iisang Turso
database ng website, mobile app at admin. Kopyahin ang `.env.example` bilang
`.env.local` at ilagay ang URL at token (kapareho ng sa website).

**Wala:** binabasa nito ang SQLite ng site sa katabing folder:

```
Documents/
  camsuruptowngolf/        ← ang website (data/*.sqlite)
  admin-camsuruptowngolf/  ← ito
```

Kung nasa ibang lugar ang site:

```bash
SITE_DATA_DIR=/path/sa/camsuruptowngolf/data npm run dev
```

Ang mga admin account ay nasa `admins` table — sa Turso, o sa sariling
`data/admin.sqlite` ng folder na ito kapag lokal.
**Nakalimutan ang password?** Patakbuhin ang `npm run reset-password` at
mag-type ng bago. Ipapakita rin nito ang username mo. (Binabasa nito ang
`.env.local`, kaya ang account sa Turso ang napapalitan kapag naka-set iyon.)

## Sa Vercel

Ilagay sa Project → Settings → Environment Variables ang `TURSO_DATABASE_URL`
at `TURSO_AUTH_TOKEN`. Secure ang session cookie sa HTTPS. Sa unang bukas,
kapag wala pang admin sa Turso, lalabas ang "Create the first admin" — gawin
ito agad pagka-deploy (o lokal muna, naka-Turso ang `.env.local`).

Kailangan ng Node.js 22.18 pataas.
