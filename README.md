# Barber Noir — PWA לקביעת תורים

דמו מלא ועובד למערכת קביעת תורים למספרה/ספר, בעברית RTL, mobile-first PWA.

## התחלה מהירה

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

פתח [http://localhost:3000](http://localhost:3000)

## משתני סביבה

העתק `.env.example` ל-`.env`:

| משתנה | תיאור |
|--------|--------|
| `DATABASE_URL` | SQLite: `file:./dev.db` |
| `ADMIN_PASSWORD` | סיסמת פאנל ניהול (ברירת מחדל: `barber2024`) |
| `AUTH_SECRET` | מפתח לחתימת session |
| `CRON_SECRET` | אימות cron (אופציונלי) |
| `RESEND_API_KEY` | מפתח Resend — ריק = preview ב-console |
| `EMAIL_FROM` | כתובת שולח |
| `OWNER_EMAIL` | אימייל בעל העסק |
| `NEXT_PUBLIC_BASE_URL` | URL בסיס |
| `REMINDER_HOURS_BEFORE` | שעות לפני תזכורת (ברירת מחדל: 24) |
| `ENABLE_CRON` | `true` להפעלת cron |

## מסכים

- `/` — דף בית
- `/book` — זרימת קביעת תור (5 שלבים)
- `/admin` — פאנל ניהול (מוגן בסיסמה)
- `/admin/settings` — הגדרות עסק, שירותים, שעות, inspo

## API

- `GET /api/availability?date=&serviceId=`
- `POST /api/appointments`
- `PATCH /api/appointments/:id`
- `GET /api/cron/reminders`
- `GET /api/public` — נתונים ציבוריים

## PWA

- `manifest.webmanifest` בעברית RTL
- Service worker (Serwist) + דף `/offline`
- פרומפט "הוסף למסך הבית"

## פרודקשן (Vercel)

1. שנה `provider` ב-`schema.prisma` ל-`postgresql`
2. הגדר `DATABASE_URL` (Neon Postgres)
3. Deploy — cron מוגדר ב-`vercel.json`
4. כל חישובי זמן ב-Asia/Jerusalem

## אייקונים

```bash
node scripts/generate-icons.mjs
```

(דורש `sharp` — `npm install -D sharp`)
