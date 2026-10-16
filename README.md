# Clubhouse Office — Admin ng CamSur Uptown Golf

Dito makikita kung sino ang nag-book ng bahay sa Villa Del Rey, nag-request ng
call back (kasama ang galing sa Plan your visit), nag-subscribe sa newsletter,
at nag-sign up bilang miyembro. May login, at sa computer na ito lang bumubukas.

## Patakbuhin

Sa VS Code: **Run and Debug → "Admin dashboard"** (bubukas ang browser nang kusa).

O sa terminal sa loob ng folder na ito:

```bash
npm start
```

Tapos buksan ang <http://localhost:4000>. Sa unang bukas, gagawa ka ng unang
admin account.

## Saan kinukuha ang datos

Binabasa nito ang SQLite ng site sa katabing folder:

```
Documents/
  camsuruptowngolf/        ← ang website (data/camsuruptown.sqlite, data/members.sqlite)
  admin-camsuruptowngolf/  ← ito
```

Kung nasa ibang lugar ang site:

```bash
SITE_DATA_DIR=/path/sa/camsuruptowngolf/data npm start
```

Ang mga admin account ay nasa sariling `data/admin.sqlite` ng folder na ito.
**Nakalimutan ang password?** Itigil ang admin, burahin ang `data/admin.sqlite`,
at buksan ulit para gumawa ng bago. Hindi nadadamay ang mga booking at inquiry.

Kailangan ng Node.js 22.5 pataas. Walang `npm install`, dahil walang dependency.
# admin-camsur-uptown-golf
