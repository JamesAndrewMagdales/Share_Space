# ShareSpace – Setup and Run Instructions

ShareSpace is a peer-to-peer parking slot sharing site: hosts list unused parking
spaces, drivers search and request bookings, and hosts approve them.

- **Frontend:** React + Vite (`ShareSpace/`)
- **Backend:** Supabase (Postgres database, login/sign-up, photo storage).
  No Express server or MySQL is needed anymore.

## Run it

```bash
cd ShareSpace
npm install
cp .env.example .env.local   # only if .env.local doesn't exist yet
npm run dev
```

Open http://localhost:5173.

`.env.local` holds the Supabase project URL and its **publishable** key. That key is
meant to be public: Row Level Security rules in the database decide what each user
can read or change.

## Supabase project

The app uses the Supabase project **Uni360** (`cztlemlcxxanicezputu`). The database
is defined by the SQL files in `supabase/migrations/` (already applied):

| File | What it does |
|------|--------------|
| `…0001_sharespace_schema.sql` | Tables (`profiles`, `parking_types`, `spaces`, `bookings`, `reviews`), booking/review rules, security policies, `space-photos` storage bucket |
| `…0002_hardening_and_admin.sql` | Admin-only functions for the admin panel |
| `…0003_contact_messages.sql` | Messages from the Contact page |

Key rules enforced in the database (not just the UI):

- A profile is created automatically when someone signs up.
- The booking price, host and status are set by the database, so they can't be faked.
- Only the host can approve or decline; either side can cancel or mark completed.
- Only the driver of a completed booking can review the host; ratings update automatically.
- Users can't make themselves admin or verified.

### Email confirmation

New Supabase projects require new users to confirm their email before logging in.
The sign-up page handles this ("Check your email"). Supabase's built-in email
service only sends a few emails per hour; for testing you can turn confirmation
off in the Supabase dashboard: **Authentication → Sign In / Providers → Email →
Confirm email**.

### Make yourself an admin

Sign up in the app, then run this in the Supabase **SQL Editor** with your email:

```sql
update public.profiles set is_admin = true
where id = (select id from auth.users where email = 'you@example.com');
```

Log out and back in, and **Admin panel** appears in your account menu.

### Contact messages

Messages from the Contact page are stored in the `contact_messages` table. View them in
the Supabase **Table Editor**.

## Old backend

`backend/` (Express + MySQL) and `database/` are from the earlier version and are no
longer used by the frontend. They're kept for reference.
