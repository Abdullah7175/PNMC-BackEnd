# Message for Mobile App Developer — PNMC Field Inspector API

Hi,

Please find below everything you need to integrate the **PNMC Field Inspector** Flutter app with the live backend.

---

## 1. Base URLs

| Environment | Base URL |
|-------------|----------|
| **Live now (IP)** | `http://119.30.113.24:3001/api/v1` |
| **Domain (ready in ~24 hours)** | `https://pnmc.esspl.com.pk/api/v1` |
| Supervisor portal (web) | `http://119.30.113.24:3000` → later `https://pnmc.esspl.com.pk` |

**Use the IP base URL today.** When `pnmc.esspl.com.pk` DNS is live, change only the host — all API paths stay the same. Prefer HTTPS later when SSL is installed.

Suggested Flutter constant:

```dart
static const String baseUrl = 'http://119.30.113.24:3001/api/v1';
// Later: 'https://pnmc.esspl.com.pk/api/v1'
```

---

## 2. Auth / Token / Key

- There is **NO static API key** and no app secret to embed in the APK.
- Auth is **JWT only**:
  1. Call `POST /auth/login` with `"client": "mobile"`
  2. Save `accessToken` + `refreshToken` in **`flutter_secure_storage`**
  3. Send on every protected call:  
     `Authorization: Bearer {accessToken}`
- `accessToken` lasts ~**15 minutes**
- `refreshToken` lasts ~**7 days**
- On `POST /auth/refresh`, server returns a **new accessToken and new refreshToken** — save both (token rotation)
- `POST /auth/logout` revokes the refresh token server-side

### Demo field user (mobile)

| Email | Password |
|-------|----------|
| `inspector@pnmc.gov.pk` | `Field@123` |

Must send:

```json
{ "email": "inspector@pnmc.gov.pk", "password": "Field@123", "client": "mobile" }
```

Email may only contain letters, numbers, `@`, and `.` (e.g. `admin@admin.com`).

---

## 3. Main APIs (all under base URL)

### Auth
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me` — returns full profile (name, phone, NIC, work ID, designation, address, office details, region)
- `POST /auth/logout`

> **Profile note:** User details (phone, NIC, designation, address, office, etc.) are returned on login / me / refresh. Admins set them in the portal. See `MOBILE_USER_PROFILE_MESSAGE.md`.

### Lookups (do not hardcode lists)
- `GET /mobile/lookups` ← use this after login
- Provinces / districts / applied-for / inspection types also available separately under `/mobile/lookups/...`

### Checklist
- `GET /checklist-templates/active` — official 23-item PNMC checklist

### Inspections (field user — own forms only)
- `GET /mobile/inspections`
- `GET /mobile/inspections/{id}`
- `POST /mobile/inspections` — create (prefer `provinceId`, `districtId`, `appliedForId`)
- `PATCH /mobile/inspections/{id}` — partial save
- `PATCH /mobile/inspections/{id}/fee-details`
- `PATCH /mobile/inspections/{id}/requirements/{responseId}` — `ok` / `reject`
- `POST .../comments`
- `POST .../attachments` — multipart field name **`file`** (JPEG/PNG/PDF ≤ 10MB)
- `DELETE .../attachments/{attachmentId}`
- `POST /mobile/inspections/{id}/signature` — multipart **`file`** (JPEG/PNG ≤ 512KB)
- `POST /mobile/inspections/{id}/submit`
- `GET /mobile/activity` — optional own audit history

No delete-inspection API. After submit, form is view-only until supervisor requests changes.

Drive UI with API fields: `canEdit`, `status`, `supervisorRemarks`.

File/attachment URLs are **signed** and expire (~1 hour). Keep `?exp=` and `?sig=` query params.

---

## 4. Full documentation

Complete details (payloads, statuses, validation, curl examples, checklist) are in the backend repo:

- **`MOBILE_DEVELOPER_HANDOFF.md`** — full guide  
- **`MOBILE_API.md`** — short reference  

GitHub: https://github.com/Abdullah7175/PNMC-BackEnd

---

## 5. Quick smoke test

```bash
curl -X POST http://119.30.113.24:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"inspector@pnmc.gov.pk","password":"Field@123","client":"mobile"}'
```

If you get `accessToken` + `refreshToken`, you are connected.

Please confirm once login + lookups + create inspection work on your side. When the domain is live we will confirm HTTPS cutover if needed.

Thanks,  
Backend Team
