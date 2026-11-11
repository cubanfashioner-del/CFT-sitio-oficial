# Supabase account profile setup

The site requires a Supabase `profiles` table for account usernames and phone numbers. Apply the migration before accepting registrations:

```powershell
supabase login
supabase link --project-ref fzgkaolxngitwlatsusf
supabase db push
```

The migrations create the profile table, a case-insensitive unique username index, owner-only row-level security policies, and a trigger that creates a profile when an Auth user is registered. Registration does not require a username or phone number: Supabase generates an internal username when one is omitted, and the phone number remains empty until the user adds it from **Mi cuenta**.

## Secure account deletion

Account deletion is performed by the `delete-account` Edge Function. It verifies the caller's access token and deletes only that authenticated user's Supabase Auth account. The profile row is removed by its `ON DELETE CASCADE` foreign key. Never put a Supabase service-role key in browser code.

Set the allowed website origin and deploy the function:

```powershell
supabase secrets set ALLOWED_ORIGIN=https://cubanfashioner-del.github.io
supabase functions deploy delete-account
```

The Supabase Edge Runtime provides `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to deployed functions. If the service-role secret is not present in the project environment, configure it through the Supabase Dashboard's Edge Function secrets before deployment. Keep it secret.

For local development, set `ALLOWED_ORIGIN` to the exact origin serving the site, such as `http://127.0.0.1:8765`, when running the function locally.
