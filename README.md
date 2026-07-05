This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Calendly integration

### Advisor OAuth (per-advisor scheduling)

Each advisor connects their own Calendly account from **Advisor portal → My Profile → Integrations**. After OAuth, students book sessions on that advisor's Calendly event (not the shared org URL).

#### Environment

```bash
CALENDLY_CLIENT_ID=your_oauth_client_id
CALENDLY_CLIENT_SECRET=your_oauth_client_secret
CALENDLY_OAUTH_REDIRECT_URI=http://localhost:3000/api/integrations/calendly/callback

# Signing key from Calendly OAuth app / webhook subscription (server-only)
CALENDLY_WEBHOOK_SIGNING_KEY=your_signing_key_here

# Optional — shared Calendly event URL for application-support only
NEXT_PUBLIC_CALENDLY_APPLICATION_SUPPORT_URL=https://calendly.com/admin-univeera/30min

# Site origin used for OAuth redirect and webhook callback URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

#### Calendly developer portal (one-time)

1. Sign up at [Calendly Developer](https://developer.calendly.com/) and create an **OAuth app** (use **Sandbox** for local dev).
2. Set **Redirect URI** to match `CALENDLY_OAUTH_REDIRECT_URI` (HTTP localhost allowed in Sandbox).
3. Enable scopes: `users:read`, `event_types:read`, `webhooks:write`, `scheduled_events:read`.
4. Copy **Client ID**, **Client Secret**, and **Webhook signing key** into env vars.

On connect, the app stores tokens on the `advisors` row, saves the first active event type's scheduling URL, and registers a user-scoped `invitee.created` webhook to `/api/webhooks/calendly`.

### Calendly webhook (advisor session `booked_at`)

When a student picks a time in Calendly after confirming an advisor session, Calendly sends `invitee.created` to the app, which sets `advisor_sessions.booked_at` and `status = confirmed`.

### Environment

```bash
# See "Calendly integration" above for OAuth variables.
CALENDLY_WEBHOOK_SIGNING_KEY=your_signing_key_here
NEXT_PUBLIC_CALENDLY_APPLICATION_SUPPORT_URL=https://calendly.com/admin-univeera/30min
```

### Calendly dashboard setup (one-time)

1. In Calendly: **Integrations → Webhooks** (or API → Webhook subscriptions).
2. Create a subscription:
   - **URL**: `https://<your-production-domain>/api/webhooks/calendly`
   - **Events**: `invitee.created` only
   - **Scope**: organization (matches the shared 30min event type)
3. Copy the **signing key** into `CALENDLY_WEBHOOK_SIGNING_KEY` on Vercel (and `.env.local` for local dev).
4. Local testing: expose the dev server with ngrok or Cloudflare Tunnel to `http://localhost:3000/api/webhooks/calendly`.

Advisor bookings pass `utm_content=advisor_session:<id>` in the embed URL so the webhook can match the row. Application-support Calendly flows without that prefix are ignored.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
