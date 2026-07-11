# Mobile Field Inspector API — Quick Reference

## Live environment

| | Now (IP) | Soon (domain, ~24h) |
|--|----------|---------------------|
| **API base** | `http://119.30.113.24:3001/api/v1` | `http://pnmc.esspl.com.pk:3001/api/v1` |
| **Portal** | `http://119.30.113.24:3000` | `http://pnmc.esspl.com.pk:3000` |

**Auth:** JWT Bearer only — **no API key**.  
**Header:** `Authorization: Bearer {accessToken}`  
**Demo mobile user:** `inspector@pnmc.gov.pk` / `Field@123`  
**Login must include:** `"client": "mobile"`

### Tokens

| Token | Lifetime | Notes |
|-------|----------|--------|
| `accessToken` | ~15 min | Send on every call |
| `refreshToken` | ~7 days | `POST /auth/refresh` — response returns **new** access + refresh (replace both) |

Store in `flutter_secure_storage`. Logout revokes refresh server-side.

### Security

- Email: letters, numbers, `@`, `.` only  
- Uploads: evidence JPEG/PNG/PDF ≤10MB; signature JPEG/PNG ≤512KB; form field `file`  
- File URLs are signed (`?exp=&sig=`) — do not strip query params  

## Endpoints

### Auth
- `POST /auth/login`
- `POST /auth/refresh`
- `GET /auth/me`
- `POST /auth/logout`

### Lookups
- `GET /mobile/lookups`
- `GET /mobile/lookups/provinces`
- `GET /mobile/lookups/provinces/:provinceId/districts`
- `GET /mobile/lookups/applied-for`
- `GET /mobile/lookups/inspection-types`
- `GET /mobile/activity`

### Checklist
- `GET /checklist-templates/active`

### Inspections
- `GET /mobile/inspections`
- `GET /mobile/inspections/:id`
- `POST /mobile/inspections`
- `PATCH /mobile/inspections/:id`
- `PATCH /mobile/inspections/:id/fee-details`
- `PATCH /mobile/inspections/:id/requirements/:responseId`
- `POST /mobile/inspections/:id/requirements/:responseId/comments`
- `POST /mobile/inspections/:id/requirements/:responseId/attachments`
- `DELETE /mobile/inspections/:id/attachments/:attachmentId`
- `POST /mobile/inspections/:id/signature`
- `POST /mobile/inspections/:id/submit`

Full guide: **`MOBILE_DEVELOPER_HANDOFF.md`**
