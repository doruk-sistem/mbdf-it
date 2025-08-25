# Auth: Magic Link + Email/Password

This update enables dual authentication: Supabase Magic Link and Email/Password, with a unified callback, onboarding checks, and server actions.

## Server Actions
- sendMagicLink(email)
- signInWithPassword({ email, password })
- signUpWithPassword({ email, password })
- sendPasswordReset(email)
- updatePassword(newPassword)
- signOut()

All actions use the Supabase server client via `@supabase/ssr` and preserve RLS.

## Routes
- /auth/sign-in: Tabs for Magic Link and Email/Password
- /auth/sign-up: Email + Password registration
- /auth/forgot-password: Reset link sender
- /auth/reset-password: Set new password after callback session
- /auth/callback: `exchangeCodeForSession` then redirect to `next` or onboarding/home

## SQL
Trigger ensures `public.profiles` row exists on new auth user and is idempotent via `on conflict (id) do nothing`.

## Middleware
Protects `/mbdf`, `/agreements`, `/kks`, `/settings`, `/` and allows `/auth/*` and public assets. Redirects authenticated users away from auth pages.

## Environment
Required:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
RESEND_API_KEY=...
EMAIL_FROM="MBDF-IT <no-reply@yourdomain.com>"
```

## UX & Validation
- Password min length 8 (client + server)
- Clear error toasts
- Loading states
- Dark mode compatible

# Magic Link Sign-in Fix

This change addresses intermittent Supabase error: "AuthApiError: Database error finding user" shown when calling `signInWithOtp`.

## Root Cause

- Mismatch between `emailRedirectTo` hostname and Supabase Auth redirect allowlist during local dev.
- Users accessed the app via `localhost` while `site_url` was `127.0.0.1`, or vice versa, causing token creation/validation issues.

## Changes

- `supabase/config.toml`:
  - Added variants to `[auth].additional_redirect_urls`: `http/https` for `localhost`, `127.0.0.1`, and `0.0.0.0`.
  - Kept `auth.email.enable_confirmations = false` for local dev.

- `app/actions/auth.ts`:
  - Normalized `emailRedirectTo` to `${NEXT_PUBLIC_SITE_URL}/auth/callback` with fallback `http://127.0.0.1:3000`.
  - Graceful error handling for unexpected DB errors with clearer user feedback.

## How to Use

1. Ensure `.env.local` contains:

```
NEXT_PUBLIC_SITE_URL=http://127.0.0.1:3000
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

2. Access the app using the exact URL in `NEXT_PUBLIC_SITE_URL`.
3. Send magic link again from `/auth/sign-in`.

## Troubleshooting

- If error persists:
  - Open `/debug` page and verify `NEXT_PUBLIC_SITE_URL` matches the browser origin.
  - Confirm the callback route `/auth/callback` is reachable.
  - Restart local Supabase if you changed `supabase/config.toml`:
    - `supabase stop && supabase start`


