# Mobile Field Inspector API

Base URL: `http://localhost:3001/api/v1`

Auth: `Authorization: Bearer {accessToken}`

## Login

```
POST /auth/login
{ "email": "inspector@pnmc.gov.pk", "password": "Field@123", "client": "mobile" }
```

Always send `"client": "mobile"`. Portal login (`client: "portal"`) blocks field users.

## Activity (optional)

```
GET /mobile/activity
```

Returns your own recent audit trail. All create/update/submit actions are logged automatically by the server — no write API needed.

Demo field user: `inspector@pnmc.gov.pk` / `Field@123` (`isMobileUser: true`)

## Form lookups (use for dropdowns)

```
GET /mobile/lookups
```

Returns provinces (with nested districts), applied-for categories, and inspection types.

| Method | Path |
|--------|------|
| GET | `/mobile/lookups` |
| GET | `/mobile/lookups/provinces` |
| GET | `/mobile/lookups/provinces/:provinceId/districts` |
| GET | `/mobile/lookups/applied-for` |
| GET | `/mobile/lookups/inspection-types` |

`inspection-types` = form **Status** field: New / Enhancement / Re-inspection / Evening Shift

## Inspection APIs

| Method | Path | Notes |
|--------|------|-------|
| GET | `/mobile/inspections` | Own list |
| GET | `/mobile/inspections/:id` | Full form |
| POST | `/mobile/inspections` | Create (prefer IDs) |
| PATCH | `/mobile/inspections/:id` | Partial save |
| PATCH | `/mobile/inspections/:id/fee-details` | Fee table |
| PATCH | `/mobile/inspections/:id/requirements/:responseId` | ok / reject |
| POST | `.../comments` | Comment |
| POST | `.../attachments` | multipart `file` |
| DELETE | `.../attachments/:attachmentId` | Before submit |
| POST | `/mobile/inspections/:id/signature` | Signature |
| POST | `/mobile/inspections/:id/submit` | Submit & lock |

### Create (preferred)

```json
{
  "instituteName": "Abc Nursing Institute",
  "provinceId": "uuid",
  "districtId": "uuid",
  "appliedForId": "uuid",
  "type": "newInspection",
  "principalName": "Dr. Sarah Ahmed",
  "principalRegNo": "PN-4521",
  "principalQualification": "MSN",
  "inspectionDate": "2026-07-10"
}
```

`type`: `newInspection` | `enhancement` | `reinspection` | `eveningShift`

Full handoff: see `MOBILE_DEVELOPER_HANDOFF.md`
