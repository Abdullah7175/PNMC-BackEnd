# PNMC Field Inspector — Mobile Developer Complete Guide

**For:** Flutter / Mobile App Developer  
**From:** Backend / API Team  
**Updated:** 11 July 2026  
**API Version:** `v1`

---

## 0. Copy-paste summary (start here)

| Item | Value |
|------|--------|
| **Live server IP (use now)** | `119.30.113.24` |
| **Domain (use after DNS is live ~24h)** | `pnmc.esspl.com.pk` |
| **API Base URL (IP — current)** | `http://119.30.113.24:3001/api/v1` |
| **API Base URL (domain — soon)** | `http://pnmc.esspl.com.pk:3001/api/v1` *(or `https://…` if SSL is enabled later)* |
| **Supervisor portal (web)** | `http://119.30.113.24:3000` → later `http://pnmc.esspl.com.pk:3000` |
| **Auth type** | JWT Bearer — **no static API key** |
| **Header on every protected call** | `Authorization: Bearer {accessToken}` |
| **Demo mobile user** | `inspector@pnmc.gov.pk` / `Field@123` |
| **Login must send** | `"client": "mobile"` |

### Flutter config suggestion

```dart
// lib/config/api_config.dart
class ApiConfig {
  // USE THIS NOW (IP is live)
  static const String baseUrl = 'http://119.30.113.24:3001/api/v1';

  // SWITCH TO THIS when domain is ready (after ~24 hours)
  // static const String baseUrl = 'http://pnmc.esspl.com.pk:3001/api/v1';
  // Prefer HTTPS when SSL certificate is installed:
  // static const String baseUrl = 'https://pnmc.esspl.com.pk/api/v1';
}
```

Put base URL behind a single constant so you only change one line when the domain goes live.

---

## 1. Environments & URLs

### 1.1 Production (live now)

| Service | URL |
|---------|-----|
| **API (JSON)** | `http://119.30.113.24:3001/api/v1` |
| **API host** | `119.30.113.24` |
| **API port** | `3001` |
| **Portal (supervisors)** | `http://119.30.113.24:3000` |

All mobile paths are under:

```
{BASE_URL}/mobile/...
```

Example full URL:

```
http://119.30.113.24:3001/api/v1/mobile/inspections
```

### 1.2 Domain (pending — expected within ~24 hours)

| Item | Value |
|------|--------|
| Domain | `pnmc.esspl.com.pk` |
| Planned API base | `http://pnmc.esspl.com.pk:3001/api/v1` |
| Planned portal | `http://pnmc.esspl.com.pk:3000` |

After DNS works, test:

```bash
curl -I http://pnmc.esspl.com.pk:3001/api/v1/auth/login
```

Then update the app’s `baseUrl` to the domain (and HTTPS when available). Paths stay the same — only the host changes.

### 1.3 Local development (optional)

| Item | Value |
|------|--------|
| Local API | `http://localhost:3001/api/v1` |

---

## 2. Authentication — tokens & keys

### Important: there is NO API key / client secret

- There is **no** X-API-Key, no static app key, no secret shared in the APK.
- Security is: **login → JWT access token + refresh token**.
- Store both in **`flutter_secure_storage`** (never `SharedPreferences`).

### 2.1 Tokens explained

| Token | What it is | Lifetime | Where used |
|-------|------------|----------|------------|
| **accessToken** | JWT string | ~**15 minutes** | `Authorization: Bearer …` on every API call |
| **refreshToken** | Opaque random string (not JWT) | ~**7 days** | Only for `POST /auth/refresh` |

On every successful refresh, the server returns a **new accessToken and a new refreshToken**.  
**Always replace both** on the device. Old refresh tokens become invalid (rotation).

### 2.2 Login

```
POST {BASE_URL}/auth/login
Content-Type: application/json
```

```json
{
  "email": "inspector@pnmc.gov.pk",
  "password": "Field@123",
  "client": "mobile"
}
```

| Field | Required | Rules |
|-------|----------|--------|
| `email` | Yes | Letters, numbers, `@`, `.` only |
| `password` | Yes | 6–128 chars |
| `client` | Yes for mobile | Must be `"mobile"` |

**Email regex (client + server):**

```
^[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)*@[A-Za-z0-9]+(?:\.[A-Za-z0-9]+)+$
```

✅ `inspector@pnmc.gov.pk`  
❌ `user+tag@mail.com`  
❌ `user_name@mail.com`

**Success (200):**

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "base64url-opaque-token...",
  "user": {
    "id": "uuid",
    "email": "inspector@pnmc.gov.pk",
    "fullName": "Field Inspector",
    "employeeId": "INS-2026-0001",
    "phone": "03001234567",
    "nic": "42101-1234567-1",
    "designation": "Field Inspector",
    "address": "Karachi Central, Sindh",
    "officeDetails": "PNMC Regional Office — Karachi",
    "province": "Sindh",
    "district": "Karachi Central",
    "isMobileUser": true,
    "roles": [
      { "id": "uuid", "code": "field_inspector", "name": "Field Inspector" }
    ],
    "permissions": [
      "mobile.inspections.view",
      "mobile.inspections.create",
      "mobile.inspections.update",
      "mobile.inspections.submit"
    ]
  }
}
```

**User profile fields** (returned on login, refresh, and `GET /auth/me`):

| Field | Meaning |
|-------|---------|
| `fullName` | Full name |
| `phone` | Mobile / phone number |
| `nic` | National Identity Card (CNIC / NIC) |
| `employeeId` | Work / employee identity number |
| `designation` | Position / designation |
| `address` | Residential / postal address |
| `officeDetails` | Office name, location, or other office details |
| `province` / `district` | Region |
| `isMobileUser` | Must be `true` for mobile app |

Profile is managed by portal admins (Users create/edit). Mobile is **read-only** for these fields via login / `/auth/me`.

**Store on device:**

1. `accessToken`
2. `refreshToken`
3. `user` (for profile UI)

**Rules:**

- Always send `"client": "mobile"` from Flutter.
- Portal accounts (`isMobileUser: false`) **cannot** log in to mobile.
- Mobile accounts **cannot** log in to the supervisor portal.
- Login is rate-limited (~10 attempts / minute / IP).

### 2.3 Refresh (when access token expires → HTTP 401)

```
POST {BASE_URL}/auth/refresh
Content-Type: application/json
```

```json
{
  "refreshToken": "your-stored-refresh-token"
}
```

**Response (200):**

```json
{
  "accessToken": "new-access-token...",
  "refreshToken": "new-refresh-token...",
  "user": { "...": "same shape as login user" }
}
```

App logic:

```
API call → 401
  → POST /auth/refresh with stored refreshToken
  → save BOTH new tokens
  → retry original API call
  → if refresh fails → force logout
```

### 2.4 Profile

```
GET {BASE_URL}/auth/me
Authorization: Bearer {accessToken}
```

### 2.5 Logout

```
POST {BASE_URL}/auth/logout
Authorization: Bearer {accessToken}
```

Server **revokes** the refresh token. Clear local secure storage after this.

---

## 3. Demo / test accounts

| Use | Email | Password | Notes |
|-----|-------|----------|--------|
| **Mobile app (field)** | `inspector@pnmc.gov.pk` | `Field@123` | `isMobileUser: true` — use this in Flutter |
| Portal admin | `admin@pnmc.gov.pk` | `Admin@123` | Web portal only — **not** for mobile |
| Portal supervisor | `supervisor@pnmc.gov.pk` | `Supervisor@123` | Web portal only |

Only users with **`isMobileUser = true`** can call `/mobile/*`.

---

## 4. Security rules (must follow in the app)

| Topic | Rule |
|-------|------|
| Token storage | `flutter_secure_storage` only |
| Headers | `Authorization: Bearer {accessToken}` on all protected routes |
| Extra JSON fields | Rejected by server — do not send unknown keys |
| Path IDs | Must be UUID v4 |
| Uploads | Field name must be `file` |
| Evidence files | JPEG / PNG / PDF, max **10 MB** |
| Signature | JPEG / PNG, max **512 KB** |
| File URLs | Signed + expire (~1 hour). Keep `?exp=&sig=` query params |
| Audit | Automatic on server — no write-audit API needed |

---

## 5. Complete API list

Base = `http://119.30.113.24:3001/api/v1` (switch host to domain later)

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/login` | No | Login (`client: "mobile"`) |
| POST | `/auth/refresh` | No | Rotate tokens |
| GET | `/auth/me` | Bearer | Current user |
| POST | `/auth/logout` | Bearer | Revoke refresh + logout |

### Lookups (dropdowns)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/mobile/lookups` | Bearer | Provinces+districts, applied-for, inspection types |
| GET | `/mobile/lookups/provinces` | Bearer | Provinces only |
| GET | `/mobile/lookups/provinces/{provinceId}/districts` | Bearer | Districts for province |
| GET | `/mobile/lookups/applied-for` | Bearer | Applied-for categories |
| GET | `/mobile/lookups/inspection-types` | Bearer | Form Status values |
| GET | `/mobile/activity` | Bearer | Own audit trail (optional) |

### Checklist template

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/checklist-templates/active` | Bearer* | Official 23-item PNMC checklist |

\*Requires a valid JWT (any authenticated user). Call after login.

### Inspections (mobile)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/mobile/inspections` | Bearer | List **my** inspections |
| GET | `/mobile/inspections/{id}` | Bearer | Full form (own only) |
| POST | `/mobile/inspections` | Bearer | Create draft + 23 requirements |
| PATCH | `/mobile/inspections/{id}` | Bearer | Partial save header fields |
| PATCH | `/mobile/inspections/{id}/fee-details` | Bearer | Fee table (Flag J / item #9) |
| PATCH | `/mobile/inspections/{id}/requirements/{responseId}` | Bearer | Set `ok` / `reject` |
| POST | `/mobile/inspections/{id}/requirements/{responseId}/comments` | Bearer | Add comment |
| POST | `/mobile/inspections/{id}/requirements/{responseId}/attachments` | Bearer | Upload evidence (multipart) |
| DELETE | `/mobile/inspections/{id}/attachments/{attachmentId}` | Bearer | Delete attachment (before submit) |
| POST | `/mobile/inspections/{id}/signature` | Bearer | Upload signature (multipart) |
| POST | `/mobile/inspections/{id}/submit` | Bearer | Submit & lock form |

**There is no delete-inspection API.**

---

## 6. Lookups (IMPORTANT)

Do **not** hardcode provinces, districts, applied-for, or status types.

```
GET {BASE_URL}/mobile/lookups
Authorization: Bearer {accessToken}
```

**Example response:**

```json
{
  "provinces": [
    {
      "id": "uuid",
      "name": "Sindh",
      "code": "SD",
      "districts": [
        { "id": "uuid", "name": "Karachi Central", "code": null, "provinceId": "uuid" }
      ]
    }
  ],
  "appliedFor": [
    { "id": "uuid", "name": "BSN", "code": "BSN", "description": "Bachelor of Science in Nursing" }
  ],
  "inspectionTypes": [
    { "value": "newInspection", "label": "New" },
    { "value": "enhancement", "label": "Enhancement" },
    { "value": "reinspection", "label": "Re-inspection" },
    { "value": "eveningShift", "label": "Evening Shift" }
  ]
}
```

**UI flow:**

1. After login → load `/mobile/lookups` (cache in memory)
2. User picks Province → show its `districts`
3. User picks Applied for
4. User picks Status from `inspectionTypes` → send `value` as `type`

---

## 7. Inspection APIs (details)

### Rules

| Rule | Detail |
|------|--------|
| Ownership | User only sees/edits **their own** forms |
| Editable when | `draft`, `in_progress`, `changes_requested` |
| After submit | **View only** |
| Submit precondition | All 23 requirements must be `ok` or `reject` (not `pending`) |
| Drive UI with | `canEdit`, `isSubmitted`, `status`, `supervisorRemarks` |

### 7.1 Create (preferred — use IDs)

```
POST {BASE_URL}/mobile/inspections
Authorization: Bearer {accessToken}
Content-Type: application/json
```

```json
{
  "instituteName": "Abc Nursing Institute",
  "provinceId": "uuid-from-lookups",
  "districtId": "uuid-from-lookups",
  "appliedForId": "uuid-from-lookups",
  "type": "newInspection",
  "principalName": "Dr. Sarah Ahmed",
  "principalRegNo": "PN-4521",
  "principalQualification": "MSN",
  "inspectionDate": "2026-07-10",
  "clientId": "optional-device-uuid"
}
```

| Field | Required | Limits |
|-------|----------|--------|
| `instituteName` | Yes | 2–255 |
| `provinceId` / `districtId` / `appliedForId` | Preferred | UUID |
| `type` | Yes | enum below |
| `principalName` | No | max 255 |
| `principalRegNo` | No | max 100 |
| `principalQualification` | No | max 255 |
| `inspectionDate` | No | ISO date |
| `clientId` | No | UUID for offline sync |

**`type` values:** `newInspection` | `enhancement` | `reinspection` | `eveningShift`

Server creates status `draft`, clones **23** checklist responses, creates empty fee-details for Flag J, returns `inspectionCode` (e.g. `PNMC-2026-0001`).

### 7.2 Partial save

```
PATCH {BASE_URL}/mobile/inspections/{id}
```

Any subset of header fields + optional `finalRemarks` (max 1000).  
First meaningful update: `draft` → `in_progress`.

### 7.3 Fee details (Requirement #9 / Flag – J)

```
PATCH {BASE_URL}/mobile/inspections/{id}/fee-details
```

```json
{
  "lineItems": [
    { "code": "BSN", "label": "BSN", "amount": 200000, "remainingFee": 0, "selected": true },
    { "code": "APPLICATION_FEE", "label": "Application Fee", "amount": 50000, "remainingFee": 0, "selected": true }
  ],
  "totalPayable": 250000,
  "paidAmount": 250000,
  "challanReference": "CH-12345",
  "bankAccount": "PK00XXXX",
  "notes": "Challan attached"
}
```

Amounts: `0` … `99999999`. Max 50 line items.  
Also upload challan via attachments on that requirement’s `responseId`.

### 7.4 Requirement status

```
PATCH {BASE_URL}/mobile/inspections/{id}/requirements/{responseId}
{ "status": "ok" }
```

| Value | UI |
|-------|-----|
| `pending` | Pending |
| `ok` | OK |
| `reject` | N/A |

### 7.5 Comment

```
POST {BASE_URL}/mobile/inspections/{id}/requirements/{responseId}/comments
{ "text": "Verified against bank record." }
```

Max 2000 characters.

### 7.6 Upload evidence

```
POST {BASE_URL}/mobile/inspections/{id}/requirements/{responseId}/attachments
Content-Type: multipart/form-data
```

| Form field | Value |
|------------|--------|
| `file` | Binary JPEG / PNG / PDF ≤ 10 MB |

### 7.7 Delete attachment

```
DELETE {BASE_URL}/mobile/inspections/{id}/attachments/{attachmentId}
```

Only while form is editable.

### 7.8 Signature

```
POST {BASE_URL}/mobile/inspections/{id}/signature
Content-Type: multipart/form-data
```

| Form field | Value |
|------------|--------|
| `file` | PNG / JPEG ≤ 512 KB |

### 7.9 Submit

```
POST {BASE_URL}/mobile/inspections/{id}/submit
{ "finalRemarks": "Optional remarks (max 1000)" }
```

After success: `status` → `submitted` (or `resubmitted`), `canEdit` → `false`.  
Form appears in supervisor portal for review.

### 7.10 Signed file URLs

Attachment / signature URLs look like:

```
http://119.30.113.24:3001/api/v1/files/inspections/{id}/.../file.jpg?exp=...&sig=...
```

- Do **not** strip `exp` / `sig`
- Links expire (~1 hour) — re-fetch inspection if image fails to load

---

## 8. Status values

| Status | Meaning | Mobile can edit? |
|--------|---------|------------------|
| `draft` | Just created | Yes |
| `in_progress` | Partially filled | Yes |
| `submitted` | Waiting for supervisor | No |
| `under_review` | Supervisor reviewing | No |
| `approved` | Accepted | No |
| `rejected` | Rejected | No |
| `changes_requested` | Fix and resubmit | Yes |
| `resubmitted` | Sent again | No |

Always trust **`canEdit`** from the API.

---

## 9. Suggested Flutter flow

```
1. Login  POST /auth/login  { client: "mobile" }
2. Save accessToken + refreshToken + user  (secure storage)
3. GET /mobile/lookups  (cache)
4. Dashboard  GET /mobile/inspections
5. New inspection:
     show dropdowns from lookups
     POST /mobile/inspections
     PATCH partial saves while filling
     PATCH requirements / fee / comments
     POST attachments / signature
     POST submit
6. After submit: GET only — show status + supervisorRemarks
7. On 401: refresh → retry; if fail → logout
```

---

## 10. Errors

| HTTP | Meaning | App action |
|------|---------|------------|
| 400 | Validation failed | Show `message` |
| 401 | Token missing/expired/invalid | Refresh or re-login |
| 403 | Not mobile user / not owner / form locked | Show message |
| 404 | Not found | Show message |
| 429 | Rate limited | Wait and retry |

Typical body:

```json
{
  "statusCode": 403,
  "message": "Inspection is locked. After submit you can only view status and details."
}
```

---

## 11. Quick cURL tests (live IP)

```bash
BASE=http://119.30.113.24:3001/api/v1

# Login
curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"inspector@pnmc.gov.pk","password":"Field@123","client":"mobile"}'

# List (replace TOKEN)
curl -s $BASE/mobile/inspections \
  -H "Authorization: Bearer TOKEN"

# Lookups
curl -s $BASE/mobile/lookups \
  -H "Authorization: Bearer TOKEN"
```

When domain is live, replace host with `pnmc.esspl.com.pk`.

---

## 12. Flutter integration checklist

1. [ ] Set `baseUrl` to `http://119.30.113.24:3001/api/v1`
2. [ ] Login with `"client": "mobile"`
3. [ ] Store tokens in `flutter_secure_storage`
4. [ ] Attach `Authorization: Bearer …` on all `/mobile/*` calls
5. [ ] On 401 → refresh (save **both** new tokens) → else logout
6. [ ] Use lookups for Province / District / Applied for / Status
7. [ ] Prefer `provinceId`, `districtId`, `appliedForId` on create
8. [ ] Partial save with PATCH while filling
9. [ ] Upload files as multipart field name `file`
10. [ ] Keep signed URL query params for images
11. [ ] Use `canEdit` / `status` / `supervisorRemarks` for UI
12. [ ] When domain is ready → change only `baseUrl` to `http://pnmc.esspl.com.pk:3001/api/v1`
13. [ ] When HTTPS is ready → switch to `https://pnmc.esspl.com.pk/api/v1` (port may change if reverse-proxied)

---

## 13. What is NOT provided (by design)

| Item | Status |
|------|--------|
| Static API key / app secret | **Not used** — JWT only |
| Delete inspection API | **Not available** |
| Portal login for field users | **Blocked** |
| Hardcoded location lists | **Do not hardcode** — use lookups |

---

## 14. Contacts / notes

- Live API (now): `http://119.30.113.24:3001/api/v1`
- Domain (soon): `pnmc.esspl.com.pk` — same API paths under `/api/v1`
- Portal for supervisors: port `3000` on the same host
- All mobile actions are audited automatically on the server
- If anything is unclear, request a Postman collection or a live walkthrough of:  
  **login → lookups → create → fill → attach → submit → status**

---

**End of handoff — Mobile Field Inspector API v1**
