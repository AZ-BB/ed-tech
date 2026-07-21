# Independent Student Provision API

Create an independent (no-school) student account and get a one-time URL that signs the student into the Univeera student portal.

Use this when your system should provision a student and immediately send them into the portal without sharing a password.

---

## Base URL

| Environment | Base URL |
|-------------|----------|
| Production | `https://www.univeera.me` |
| Staging / preview | Provided by Univeera if applicable |

**Endpoint**

```
POST {BASE_URL}/api/students/independent
```

---

## Authentication

Include your API key on every request:

```http
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

Univeera issues the API key. Keep it secret (server-side only). Do not expose it in browsers, mobile apps, or public repos.

| HTTP status | Meaning |
|-------------|---------|
| `401` | Missing, malformed, or invalid API key |
| `503` | Service temporarily unavailable |

---

## Create student

### Request

```http
POST /api/students/independent
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `firstName` | string | yes | Student first name |
| `lastName` | string | yes | Student last name |
| `email` | string | yes | Unique email used as the login identity |
| `grade` | string | yes | Exactly one of: `Grade 9`, `Grade 10`, `Grade 11`, `Grade 12` |
| `nationalityCountryCode` | string | yes | ISO 3166-1 alpha-2 country code (e.g. `EG`, `US`, `GB`) |
| `featureAccess` | object | no | Which portal features the student can use (see below) |
| `metaData` | object | no | Free-form JSON for your own IDs or tracking (returned nowhere; stored for Univeera ops) |

**Notes**

- A password is generated automatically. It is **not** returned and **no** credentials email is sent.
- The only way to sign the student in after create is the `redirectUrl` in the response.
- Emails are treated case-insensitively.

### `featureAccess`

Optional object of booleans. Any key you omit defaults to **enabled** (`true`).

| Key | Feature |
|-----|---------|
| `personality_overview` | Personality Overview |
| `program_discovery` | Program Discovery |
| `universities` | Discover Universities |
| `scholarships` | Scholarships |
| `advisor_sessions` | 1:1 Advisor sessions |
| `ambassadors` | Ambassadors |
| `application_support` | Application Support |
| `post_admission` | Post Admission |

Independent students are not linked to a school, so **My Applications** is not available for them.

New accounts receive **1 advisor** and **1 ambassador** session credit by default.

### Example request body

```json
{
  "firstName": "Ada",
  "lastName": "Lovelace",
  "email": "ada@example.com",
  "grade": "Grade 12",
  "nationalityCountryCode": "EG",
  "featureAccess": {
    "personality_overview": true,
    "program_discovery": true,
    "universities": true,
    "scholarships": false,
    "advisor_sessions": true,
    "ambassadors": false,
    "application_support": true,
    "post_admission": false
  },
  "metaData": {
    "externalId": "crm-123",
    "source": "partner-name"
  }
}
```

---

## Success response

**`201 Created`**

```json
{
  "studentId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "email": "ada@example.com",
  "redirectUrl": "https://univeera.me/auth/confirm?token_hash=...&type=magiclink&next=%2Fstudent"
}
```

| Field | Description |
|-------|-------------|
| `studentId` | Univeera student ID (UUID). Store this if you need to reference the student later. |
| `email` | Normalized email used for the account |
| `redirectUrl` | **One-time** auto sign-in link. Send the student here (redirect or open in browser). After success they land in the student portal. |

### Using `redirectUrl`

1. Call this API from your backend.
2. Take `redirectUrl` from the `201` response.
3. Redirect the student’s browser to that URL (HTTP 302), or open it in a new tab / deep link as appropriate.

The link is single-use and expires after a short time. If it fails or expires, create is already done — contact Univeera support rather than creating a duplicate email.

Do **not** try to parse or modify query params on `redirectUrl`; use it as returned.

---

## Error responses

Body shape:

```json
{ "error": "Human-readable message" }
```

In rare cases after the student was created but sign-in link generation failed, the body may also include `studentId` and `email`.

| Status | Meaning |
|--------|---------|
| `400` | Invalid or incomplete payload (bad email, grade, nationality, JSON shape, etc.) |
| `401` | Invalid API key |
| `409` | Email already registered |
| `500` | Unexpected server error |
| `503` | Service unavailable |

---

## Integration examples

### cURL

```bash
curl -X POST "https://univeera.me/api/students/independent" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "Ada",
    "lastName": "Lovelace",
    "email": "ada@example.com",
    "grade": "Grade 12",
    "nationalityCountryCode": "EG",
    "featureAccess": {
      "personality_overview": true,
      "program_discovery": true,
      "universities": true,
      "scholarships": false,
      "advisor_sessions": true,
      "ambassadors": false,
      "application_support": true,
      "post_admission": false
    },
    "metaData": {
      "externalId": "crm-123",
      "source": "partner-name"
    }
  }'
```

### Node.js (fetch)

```js
const res = await fetch("https://univeera.me/api/students/independent", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${process.env.UNIVEERA_API_KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    grade: "Grade 12",
    nationalityCountryCode: "EG",
    featureAccess: {
      personality_overview: true,
      program_discovery: true,
      universities: true,
      scholarships: false,
      advisor_sessions: true,
      ambassadors: false,
      application_support: true,
      post_admission: false,
    },
    metaData: { externalId: "crm-123", source: "partner-name" },
  }),
});

if (!res.ok) {
  const err = await res.json();
  throw new Error(err.error || `HTTP ${res.status}`);
}

const { studentId, email, redirectUrl } = await res.json();
// Redirect the end user to redirectUrl
```

---

## Recommended flow

```text
Your backend                         Univeera                         Student browser
     |                                   |                                   |
     |  POST /api/students/independent   |                                   |
     |  + Bearer API key + student JSON  |                                   |
     |---------------------------------->|                                   |
     |  201 { studentId, redirectUrl }   |                                   |
     |<----------------------------------|                                   |
     |                                   |                                   |
     |  Redirect / send user to redirectUrl                                  |
     |------------------------------------------------------------------>    |
     |                                   |   verify + set session            |
     |                                   |<----------------------------------|
     |                                   |   land on /student portal         |
     |                                   |---------------------------------->|
```

---

## Support

For API keys, production access, or issues with provisioned accounts, contact your Univeera partner contact.
