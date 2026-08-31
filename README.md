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

## Independent student provision API

External partner docs for creating independent students and auto sign-in:

[docs/independent-student-provision-api.md](docs/independent-student-provision-api.md)

## Stripe payments (application & post-admission support)

Payment request emails link to `/application-support/pay/{token}` or `/post-admission-support/pay/{token}`. Those pages embed a Stripe Payment Element on your site (no redirect to Stripe hosted checkout).

### Environment

```bash
STRIPE_SECRET_KEY=sk_test_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Optional — local webhook testing via `npm run stripe`
STRIPE_CLI_WEBHOOK_SECRET=whsec_...
```

Local webhook forwarding:

```bash
npm run stripe
```

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

## WhatsApp Cloud API (day-before session reminders)

Sends one-way WhatsApp template reminders the day before Calendly-booked **advisor sessions** and **post-admission support sessions**. Email confirmations via Resend are unchanged.

Official docs: [Get Started](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started/), [Access Tokens](https://developers.facebook.com/docs/whatsapp/business-management-api/access-tokens/), [Message Templates](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/), [Send Templates](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/send-message-templates/), [Webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/guides/set-up-webhooks/).

### Environment

```bash
WHATSAPP_ENABLED=1
WHATSAPP_ACCESS_TOKEN=your_system_user_permanent_token
WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
WHATSAPP_API_VERSION=v22.0
WHATSAPP_TEMPLATE_SESSION_REMINDER=session_day_before_reminder
WHATSAPP_WEBHOOK_VERIFY_TOKEN=your_random_verify_token

# Required for the daily cron job (shared with webinar reminders)
CRON_SECRET=your_cron_secret
```

Apply migration `20260831120000_whatsapp_session_reminders.sql` before enabling.

### Meta Business setup (one-time)

1. **Business Portfolio** — [business.facebook.com](https://business.facebook.com) → create or use an existing portfolio; complete **Business verification** in Security Center.
2. **Developer account** — [developers.facebook.com](https://developers.facebook.com) → register as a developer.
3. **Meta app** — My Apps → Create App → **Business** type → connect to your portfolio.
4. **WhatsApp product** — App Dashboard → Add Product → WhatsApp → Set up → connect or create a **WhatsApp Business Account (WABA)**. Record **WABA ID**, **Phone Number ID**, and **App ID** from API Setup.
5. **Test recipients** (Development mode) — API Setup → add and verify your personal WhatsApp number.
6. **First test message** — Generate a temporary token on API Setup and send the pre-approved `hello_world` template.
7. **Production phone number** — WhatsApp Manager → Phone numbers → add and verify a business number; set display name (e.g. Univeera).
8. **Permanent token** — Business Settings → System users → create user → Assign assets (App + WABA, full control) → Generate token with permissions: `whatsapp_business_messaging`, `whatsapp_business_management`, `business_management`. Store in `WHATSAPP_ACCESS_TOKEN`.
9. **Message template** — WhatsApp Manager → Message templates → Create → Category **Utility** → name `session_day_before_reminder` → language **English** → body:

   ```
   Hi {{1}}, this is a reminder that your {{2}} session with {{3}} is tomorrow ({{4}}). Meeting link: {{5}}. Reply here if you need help.
   ```

   Submit and wait for **APPROVED** status before production use.

10. **Webhook (optional, recommended)** — App Dashboard → WhatsApp → Configuration:
    - Callback URL: `https://<your-domain>/api/webhooks/whatsapp`
    - Verify token: same as `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
    - Subscribe to `messages`

    If inbound events do not arrive, force-subscribe via Graph API:

    ```bash
    curl -X POST "https://graph.facebook.com/v22.0/WABA_ID/subscribed_apps" \
      -H "Authorization: Bearer SYSTEM_USER_TOKEN" \
      -d "subscribed_fields=messages"
    ```

11. **Live mode** — Switch app to Live after business verification; add a payment method for WhatsApp conversation billing.

### Cron schedule

Vercel runs `/api/cron/session-reminders` daily at **05:00 UTC** (~08:00 GST). It queries sessions scheduled for the next UTC calendar day and sends WhatsApp reminders to students with a phone on file.

Manual trigger:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  https://<your-domain>/api/cron/session-reminders
```

When Calendly books a session, the webhook stores `invitee_timezone` and `meeting_link` on the session row for use in the reminder.

## Arabic content translation (OpenAI)

Admin users can auto-translate university catalog fields (description, tuition, SAT policy, etc.) from English to Arabic. Translations are stored in Supabase (`universities.content_ar`) and shown on the student portal when the locale cookie is `ar`.

### Environment

```bash
# Required — server-only; never expose to the client (shared with student AI features)
OPENAI_API_KEY=your_openai_api_key

# Optional — translation model; defaults to gpt-5.6-luna
# OPENAI_TRANSLATION_MODEL=gpt-5.6-luna
```

After adding env vars locally, apply the database migrations (`20260725120000_university_content_ar.sql`, `20260725140000_translation_responses.sql`) before using **Translate to Arabic** on an admin university detail page.

Each API call is logged in the `translation_responses` table with the full request/response payloads, HTTP status, OpenAI response id (in `task_id`), token usage, and optional entity context (`entity_type`, `entity_id`, `field_key`).

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
