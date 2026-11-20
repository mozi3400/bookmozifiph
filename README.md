# Book Mozifi

Public guest booking website for Laugh Tale Tattoo & Barber Shop, Halon Café & Car Spa and Hayfa Skin & Body Care. White Bad Ideas Ventures branding, mobile layouts, compatible service/professional selection, hourly availability, guest contact validation, review, booking management and JPEG confirmation downloads.

## Shared booking records

Pay Mozifi (`mozi3400/expenses`) remains the source of truth for catalogs, prices, staff, four Halon bays, customers and booking records. This repository serves only the customer website and forwards an exact allowlist of public booking API requests to Pay. It does not copy the database, staff sessions or financial APIs. No credentials are needed by this public app. Bookings created here appear in Pay's Bookings module once both deployments are configured.

## Local development

Requires Node 22 or newer; no external runtime dependencies.

```
npm run build
npm test
npm start
```

Copy `.env.example` to `.env` to override configuration. For an isolated local Pay backend, use `PAY_BACKEND_URL=http://127.0.0.1:4183` and set `PUBLIC_URL` to this app's local origin. For local cross-origin writes also configure Pay's `BOOKING_URL` to match. Use synthetic records only.

## Coolify deployment

1. Deploy the booking changes in `mozi3400/expenses`, including its booking database migration. Keep its existing database and secrets.
2. In Pay's runtime set `BOOKING_URL=https://book.mozifi.ph` and retain `APP_URL=https://pay.mozifi.ph`.
3. Create a separate Coolify application from this repository's `main` branch using its Dockerfile; container port **3000**.
4. Set `PUBLIC_URL=https://book.mozifi.ph` and `PAY_BACKEND_URL=https://pay.mozifi.ph`. No database URL or Slack secret belongs here.
5. Point `book.mozifi.ph` to that application, enable HTTPS and verify `/health`. Domain provisioning is not performed by committing this repo.
6. Review and publish each business in Pay → Bookings → Services & setup. They initially remain unpublished. Verify an authorized real booking appears in Pay before launch.

Apply an edge rate limit to the public booking endpoints. The gateway preserves Origin checks, forwards neither browser cookies nor Authorization, has a bounded JSON body and timeout, and never retries a booking mutation automatically. Pay also checks capacity, capability keys, stale quotes and idempotency.

## Current boundaries

- Pay on site; no online payment or automatic Sales Log entries.
- Email-only Manage Booking finds capabilities already saved in that browser; it does not expose all customers' history from an email address alone. Clearing browser storage or switching devices loses that local index without the original booking capability.
- The header's loyalty-points wording is present; loyalty accrual/redemption is not implemented.
- No automated email/SMS delivery. Optional mobile format validation does not verify ownership.
- The separate ChatGPT Sites preview uses browser-local demonstration data; this repository uses the real shared backend when deployed.

Initial frontend copied from Pay Mozifi commit `667a9ae`; keep future customer UI changes synchronized between repositories. Admin UI, schema and service catalog remain in the expenses repository. Libre Caslon font license is included in `src/assets/`.
