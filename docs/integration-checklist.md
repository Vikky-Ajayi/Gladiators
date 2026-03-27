# Full-Stack Integration Checklist (Django + React + Pro Override)

## Preconditions
- Django API running at `http://localhost:8000`.
- React app running at `http://localhost:3000`.
- A valid user account exists.

## Test Checklist

1. **Login returns user object and token**
   - Submit credentials on `/login`.
   - Verify API call to `POST /api/v1/auth/login/` succeeds.
   - Confirm response contains `token` and `user`.

2. **Authenticated profile always reports Pro access**
   - After login, request `GET /api/v1/users/me/`.
   - Confirm response includes:
     - `is_pro: true`
     - `has_active_subscription: true`
     - `can_scan: true`
     - `scans_remaining: "unlimited"`

3. **Frontend redirects to dashboard and unlocks Pro UI**
   - After login/register, app redirects to `/dashboard`.
   - Dashboard shows Pro access active state (no upsell required).

4. **Pricing/Buy flow is bypassed**
   - Open `/pricing` while authenticated.
   - Confirm CTAs route to `/dashboard` and show unlocked language.
   - Confirm no call is made to payment initialization endpoints.

5. **API error handling**
   - Trigger a `404` API request.
   - Verify frontend shows a user-friendly message (`not found`) instead of crashing.
   - Trigger a server error (`500`) and verify graceful message.

6. **Authentication enforcement remains active**
   - Log out.
   - Visit a protected route (`/dashboard`, `/scan/new`).
   - Confirm redirection to `/login`.
