# Clubhouse Office — Admin ng CamSur Uptown Golf

Dito makikita ang bawat tee time na na-reserve sa `/golf/book`, nag-book ng
bahay sa Villa Del Rey, nag-request ng call back, nag-subscribe sa newsletter,
at nag-sign up bilang miyembro. May login, at sa computer na ito lang bumubukas.

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
    site-db.ts           ← binabasa ang SQLite ng site
    auth.ts              ← admin accounts at session
  proxy.ts               ← localhost lang; harang sa cross-site na POST/PATCH
scripts/reset-password.ts
```

## Saan kinukuha ang datos

Binabasa nito ang SQLite ng site sa katabing folder:

```
Documents/
  camsuruptowngolf/        ← ang website (data/*.sqlite)
  admin-camsuruptowngolf/  ← ito
```

Kung nasa ibang lugar ang site:

```bash
SITE_DATA_DIR=/path/sa/camsuruptowngolf/data npm run dev
```

Ang mga admin account ay nasa sariling `data/admin.sqlite` ng folder na ito.
**Nakalimutan ang password?** Patakbuhin ang `npm run reset-password` at
mag-type ng bago. Ipapakita rin nito ang username mo.

Kailangan ng Node.js 22.18 pataas.
