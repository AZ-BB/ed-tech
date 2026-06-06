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

## Calendly webhook (advisor session `booked_at`)

When a student picks a time in Calendly after confirming an advisor session, Calendly sends `invitee.created` to the app, which sets `advisor_sessions.booked_at` and `status = confirmed`.

### Environment

```bash
# Signing key from Calendly webhook subscription (server-only, not NEXT_PUBLIC_)
CALENDLY_WEBHOOK_SIGNING_KEY=your_signing_key_here

# Optional — shared Calendly event URL (default: admin-univeera/30min)
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
