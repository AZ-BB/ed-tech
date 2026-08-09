// Shared user-facing Calendly copy. Safe to import from client components —
// keep this file free of "server-only" imports.

export const CALENDLY_PLAN_REQUIRED_MESSAGE =
  "This Calendly account doesn't have a paid plan. Booking notifications (webhooks) require Calendly's Standard, Teams, or Enterprise plan for the account that connected — not just the plan of your organization's owner. Ask this Calendly account to be upgraded, or invite it as a member of your organization's paid Calendly workspace, then disconnect and reconnect Calendly here.";

export const CALENDLY_CONNECT_ERROR_MESSAGE =
  "Could not connect Calendly. Please try again, and make sure you approve all requested permissions.";

export const CALENDLY_WEBHOOK_UNKNOWN_ERROR_MESSAGE =
  "Calendly connected, but booking notifications couldn't be registered. We'll keep retrying automatically — if this persists, disconnect and reconnect Calendly.";
