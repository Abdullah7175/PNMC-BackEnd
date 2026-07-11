# PNMC Field Inspector — Mobile API Handoff

**For:** Flutter / Mobile App Developer  
**From:** Backend Team  
**Date:** 10 July 2026  
**API Version:** `v1`

---

## 1. Base URL & Auth

| Item | Value |
|------|--------|
| **Base URL (local)** | `http://localhost:3001/api/v1` |
| **Swagger docs** | `http://localhost:3001/docs` |
| **Auth type** | JWT Bearer token |
| **Header on every protected call** | `Authorization: Bearer {accessToken}` |
| **Content-Type (JSON)** | `application/json` |
| **Content-Type (uploads)** | `multipart/form-data` |

> There is **no static API key**. The mobile app logs in and receives a JWT. Store tokens in `flutter_secure_storage`.

### Demo field inspector account (mobile user)

| Field | Value |
|-------|--------|
| Email | `inspector@pnmc.gov.pk` |
| Password | `Field@123` |
| Flag | `isMobileUser: true` |
| Role | `field_inspector` |

Only users with **`isMobileUser = true`** can call `/mobile/*` endpoints.

---

## 2b. Form dropdown lookups (IMPORTANT)

Use these APIs to populate **Province**, **District**, **Applied for**, and **Status (inspection type)** on the registration form. Do **not** hardcode these lists.

### Recommended: one call for everything

```
GET /mobile/lookups
Authorization: Bearer {accessToken}
```

**Response:**
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

### Or fetch separately

| Method | Endpoint | Use for |
|--------|----------|---------|
| GET | `/mobile/lookups/provinces` | Province dropdown |
| GET | `/mobile/lookups/provinces/{provinceId}/districts` | Districts after province selected |
| GET | `/mobile/lookups/applied-for` | Applied for dropdown |
| GET | `/mobile/lookups/inspection-types` | Form **Status** field (New / Enhancement / …) |
| GET | `/mobile/activity` | Optional: own audit trail (last 50 actions) |

**UI flow:**
1. Load lookups after login (or on New Inspection screen)
2. User selects **Province** → filter/show its **Districts**
3. User selects **Applied for** from list
4. User selects **Status** from `inspectionTypes` → send as `type` field

### Create / update with IDs (preferred)

```json
{
  "instituteName": "Abc Nursing Institute",
  "provinceId": "province-uuid",
  "districtId": "district-uuid",
  "appliedForId": "applied-for-uuid",
  "type": "newInspection",
  "principalName": "Dr. Sarah Ahmed",
  "principalRegNo": "PN-4521",
  "principalQualification": "MSN",
  "inspectionDate": "2026-07-10"
}
```

Server resolves IDs to names and stores both. You may still send `province` / `district` / `appliedFor` as strings, but **IDs are preferred**.

**Note:** `type` on the form is the paper form “Status” (New / Enhancement / Re-inspection / Evening Shift).  
Workflow status after submit (`submitted`, `approved`, …) is separate and read-only from the API.

---

## 2c. Audit trail (automatic — no extra work required)

Every mobile API action is **automatically logged on the server** (create, update, fee, requirement status, comments, attachments, signature, submit, login/logout).

You do **not** need to call a separate “write audit” API.

### Optional: view your own activity

```
GET /mobile/activity
Authorization: Bearer {accessToken}
```

Returns the last 50 audit entries for the logged-in field user (read-only).

Portal admins see all portal + mobile activity under **Audit Logs**, filterable by source (`mobile` / `portal`).

---

## 2. Authentication APIs

### 2.1 Login

```
POST /auth/login
```

**Request body:**
```json
{
  "email": "inspector@pnmc.gov.pk",
  "password": "Field@123",
  "client": "mobile"
}
```

> **Required:** always send `"client": "mobile"` from the Flutter app.  
> Portal login uses `"client": "portal"` and **rejects** mobile field users.  
> Mobile login rejects supervisor/admin accounts that are not `isMobileUser`.

**Success response (200):**
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "email": "inspector@pnmc.gov.pk",
    "fullName": "Field Inspector",
    "employeeId": "INS-2026-0001",
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

**What to store on device:**
- `accessToken` — send on every API call (expires in ~1 hour)
- `refreshToken` — use to get a new access token (expires in ~7 days)
- `user` object — for profile UI

**Important:** If `isMobileUser` is `false`, do **not** use mobile inspection APIs (portal-only user).

---

### 2.2 Refresh token

```
POST /auth/refresh
```

```json
{
  "refreshToken": "your-refresh-token"
}
```

**Response:**
```json
{
  "accessToken": "new-access-token..."
}
```

---

### 2.3 Current user profile

```
GET /auth/me
Authorization: Bearer {accessToken}
```

Returns the same `user` object as login (without tokens).

---

### 2.4 Logout

```
POST /auth/logout
Authorization: Bearer {accessToken}
```

Clear tokens from secure storage on the app side.

---

## 3. Checklist template (master data)

Fetch once when creating a new inspection (or cache and refresh periodically).

```
GET /checklist-templates/active
```

Returns the official **PNMC Recognition Checklist 2023** — **23 requirements**, Flags **B–X**, 4 categories:

1. General Requirements (items 1–10)
2. Faculty Details and Requirements (11–13)
3. Proper Infrastructure (Building) Requirement (14–19)
4. Details and requirements regarding clinical facilities (20–23)

Item **#9 (Flag – J)** has `hasFeeDetails: true` — use the fee-details API for that item.

---

## 4. Mobile inspection APIs

All paths below are under:  
`{BASE_URL}/mobile/...`  
and require:  
`Authorization: Bearer {accessToken}`

### Rules (enforce in UI + server enforces too)

| Rule | Detail |
|------|--------|
| Ownership | User only sees/edits **their own** inspections |
| Partial save | Allowed while `draft`, `in_progress`, or `changes_requested` |
| After submit | **View only** — no edit, no new attachments/comments |
| Delete inspection | **Not allowed** — there is no delete-inspection API |
| Delete attachment | Allowed only while form is still editable |
| Submit | All 23 requirements must be `ok` or `reject` (not `pending`) |

Response always includes:
- `canEdit` — `true` / `false` (drive UI enable/disable)
- `isSubmitted` — whether form left draft/edit mode
- `status` — workflow status (see section 6)
- `supervisorRemarks` — after supervisor review

---

### 4.1 List my inspections

```
GET /mobile/inspections
```

Returns an array of inspection objects (own forms only).

---

### 4.2 Get one inspection (full form)

```
GET /mobile/inspections/{id}
```

Use this to:
- Resume a draft
- Show status after submit (`approved` / `rejected` / `changes_requested`)
- Show supervisor remarks

---

### 4.3 Create new inspection (registration)

```
POST /mobile/inspections
```

**Body (preferred — use IDs from lookups):**
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
  "clientId": "optional-uuid-generated-on-device"
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `instituteName` | Yes | Institute name |
| `provinceId` | Preferred | From `GET /mobile/lookups` |
| `districtId` | Preferred | Must belong to selected province |
| `appliedForId` | Preferred | From applied-for list |
| `province` / `district` / `appliedFor` | Optional | String fallback if not using IDs |
| `type` | Yes | From inspection-types lookup |
| `principalName` | No | |
| `principalRegNo` | No | |
| `principalQualification` | No | |
| `inspectionDate` | No | ISO date `YYYY-MM-DD` or full ISO datetime |
| `clientId` | No | UUID from mobile for offline sync |

**`type` allowed values:**
- `newInspection` → New
- `enhancement` → Enhancement
- `reinspection` → Re-inspection
- `eveningShift` → Evening Shift

**What server does:**
1. Creates inspection with status `draft`
2. Clones all **23** checklist requirement responses (`pending`)
3. Creates empty fee-details record for Flag J
4. Returns full inspection object with `inspectionCode` (e.g. `PNMC-2026-0001`)

---

### 4.4 Partial save (header / institute fields)

Call anytime while editing — form can take multiple days.

```
PATCH /mobile/inspections/{id}
```

```json
{
  "instituteName": "Updated Name",
  "district": "Lahore",
  "province": "Punjab",
  "appliedFor": "MSN",
  "type": "enhancement",
  "principalName": "...",
  "principalRegNo": "...",
  "principalQualification": "...",
  "inspectionDate": "2026-07-11",
  "finalRemarks": "Optional draft remarks"
}
```

All fields optional. Status moves `draft` → `in_progress` on first meaningful update.

---

### 4.5 Save fee payment details (Requirement #9 / Flag – J)

```
PATCH /mobile/inspections/{id}/fee-details
```

```json
{
  "lineItems": [
    { "code": "BSN", "label": "BSN", "amount": 200000, "remainingFee": 0, "selected": true },
    { "code": "APPLICATION_FEE", "label": "Application Fee", "amount": 50000, "remainingFee": 0, "selected": true },
    { "code": "INSPECTION_FEE", "label": "Inspection Fee", "amount": 250000, "remainingFee": 0, "selected": true }
  ],
  "totalPayable": 500000,
  "paidAmount": 500000,
  "challanReference": "CH-12345",
  "bankAccount": "PK44MPBL9737477140108727",
  "notes": "Original challan attached"
}
```

Default fee line codes seeded by server:  
`MSN`, `BSN`, `PRN`, `LHV`, `CMW`, `CNA`, `OTHER_DEGREE`, `OTHER_DIPLOMA`, `EVENING_SHIFT`, `ENHANCEMENT`, `INSPECTION_FEE`, `APPLICATION_FEE`

Also upload challan photo/PDF via the **attachments** API on that requirement’s `responseId`.

---

### 4.6 Update requirement status (OK / N/A)

```
PATCH /mobile/inspections/{id}/requirements/{responseId}
```

```json
{ "status": "ok" }
```

| Value | UI label | Meaning |
|-------|----------|---------|
| `pending` | Pending | Not reviewed yet |
| `ok` | OK | Document provided |
| `reject` | N/A | Document not provided |

`responseId` comes from `requirements[].id` in the inspection GET/create response.

---

### 4.7 Add comment on a requirement

```
POST /mobile/inspections/{id}/requirements/{responseId}/comments
```

```json
{
  "text": "Receipt verified against bank record."
}
```

---

### 4.8 Upload evidence (photo / PDF)

```
POST /mobile/inspections/{id}/requirements/{responseId}/attachments
Content-Type: multipart/form-data
```

| Form field | Value |
|------------|--------|
| `file` | Binary file |

**Allowed:** JPEG, PNG, PDF  
**Max size:** 10 MB

Response returns updated inspection with attachment `url`.

---

### 4.9 Delete an attachment (before submit only)

```
DELETE /mobile/inspections/{id}/attachments/{attachmentId}
```

---

### 4.10 Upload digital signature

```
POST /mobile/inspections/{id}/signature
Content-Type: multipart/form-data
```

| Form field | Value |
|------------|--------|
| `file` | Signature PNG/JPEG |

**Max size:** 500 KB

---

### 4.11 Submit final report

```
POST /mobile/inspections/{id}/submit
```

```json
{
  "finalRemarks": "Institute meets most requirements. Corrective action needed for hostel sanitation."
}
```

`finalRemarks` is optional but recommended (max 1000 chars).

**Preconditions (server validates):**
- All 23 requirements are `ok` or `reject` (none `pending`)
- Form is still editable

**After success:**
- `status` → `submitted` (or `resubmitted` if coming from `changes_requested`)
- `canEdit` → `false`
- Form appears in supervisor portal queue

---

## 5. Suggested mobile app flow

```
Login
  → GET /mobile/lookups                    (cache provinces, districts, applied-for, types)
  → Dashboard: GET /mobile/inspections
  → FAB New:
        Show dropdowns from lookups
        POST /mobile/inspections  (with provinceId, districtId, appliedForId, type)
        → Fill checklist → PATCH / partial save anytime
        → POST submit
  → After submit: GET only — show workflow status + supervisorRemarks
```

---

## 6. Inspection status values

| Status | Meaning | Mobile can edit? |
|--------|---------|------------------|
| `draft` | Just created | Yes |
| `in_progress` | Partially filled | Yes |
| `submitted` | Waiting for supervisor | No (view only) |
| `under_review` | Supervisor opened it | No |
| `approved` | Accepted | No |
| `rejected` | Rejected | No |
| `changes_requested` | Supervisor asked for fixes | Yes |
| `resubmitted` | Sent again after changes | No |

Always trust `canEdit` from the API for enabling/disabling form controls.

---

## 7. Example cURL (quick test)

```bash
# 1) Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"inspector@pnmc.gov.pk\",\"password\":\"Field@123\",\"client\":\"mobile\"}"

# 2) Create inspection (replace TOKEN)
curl -X POST http://localhost:3001/api/v1/mobile/inspections \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"instituteName\":\"Test Institute\",\"district\":\"Karachi\",\"province\":\"Sindh\",\"appliedFor\":\"BSN\",\"type\":\"newInspection\"}"

# 3) List mine
curl http://localhost:3001/api/v1/mobile/inspections \
  -H "Authorization: Bearer TOKEN"
```

---

## 8. Error handling

| HTTP | Meaning |
|------|---------|
| 400 | Validation failed (e.g. pending requirements on submit) |
| 401 | Missing/invalid/expired token → refresh or re-login |
| 403 | Not a mobile user, or not owner, or form locked |
| 404 | Inspection / requirement / attachment not found |

Error body typically:
```json
{
  "statusCode": 403,
  "message": "Inspection is locked. After submit you can only view status and details."
}
```

---

## 9. Checklist for Flutter integration

1. Replace demo login with `POST /auth/login`
2. Store JWT in `flutter_secure_storage`
3. Attach `Authorization: Bearer ...` on all `/mobile/*` calls
4. On 401 → try refresh → else logout
5. Migrate local `SharedPreferences` drafts to server via create + PATCH
6. Upload photos as multipart (not local paths)
7. Use `canEdit` / `status` from API for UI state
8. Show supervisor decision (`approved` / `rejected` / `changes_requested` + remarks)
9. Audit logging is server-side — no write API needed; optional `GET /mobile/activity` for own history

---

## 10. Contacts / notes

- Interactive API docs: `http://localhost:3001/docs` (Swagger)
- Portal supervisors review submitted forms and approve/reject; mobile sees the updated status on next GET
- Production base URL will be shared separately when deployed (same paths under `/api/v1`)

If anything is unclear, ask backend for a sample Postman collection or a live walkthrough of one full create → fill → submit cycle.
