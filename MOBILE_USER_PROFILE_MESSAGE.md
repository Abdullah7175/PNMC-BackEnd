# Message for Mobile App Developer — User Profile Fields

Hi,

We have expanded the **user profile** returned by the API. Previously only name / email / employee ID / region were available. The following fields are now included.

---

## Base URL (unchanged)

- **Now:** `http://119.30.113.24:3001/api/v1`
- **Soon:** `http://pnmc.esspl.com.pk:3001/api/v1`

---

## Where you get the profile

Same endpoints as before — the `user` object is richer:

| Endpoint | When |
|----------|------|
| `POST /auth/login` | After login (`client: "mobile"`) |
| `POST /auth/refresh` | After token refresh |
| `GET /auth/me` | Anytime with Bearer token |

There is **no separate “update profile” mobile API** yet — portal admins set these fields when creating/editing users. Mobile should **display** them (profile screen).

---

## New / updated `user` fields

| JSON field | Description | Example |
|------------|-------------|---------|
| `fullName` | Full name | `"Field Inspector"` |
| `phone` | Phone number | `"03001234567"` |
| `nic` | National Identity Card (CNIC / NIC) | `"42101-1234567-1"` |
| `employeeId` | Work / employee identity | `"INS-2026-0001"` |
| `designation` | Position / designation | `"Field Inspector"` |
| `address` | Address | `"Karachi Central, Sindh"` |
| `officeDetails` | Office details | `"PNMC Regional Office — Karachi"` |
| `province` | Province | `"Sindh"` |
| `district` | District | `"Karachi Central"` |
| `email` | Login email | `"inspector@pnmc.gov.pk"` |
| `isMobileUser` | Must be `true` | `true` |
| `roles` / `permissions` | As before | … |

Fields may be `null` if not filled by admin — handle empty values in UI.

---

## Example login `user` object

```json
{
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
```

---

## Suggested Flutter profile screen

Show at least:

- Full name  
- Designation  
- Phone  
- NIC  
- Employee / work ID  
- Address  
- Office details  
- Province / District  

Demo account (after seed / admin update):  
`inspector@pnmc.gov.pk` / `Field@123` with `"client": "mobile"`.

Full API guide remains in `MOBILE_DEVELOPER_HANDOFF.md`.

Thanks,  
Backend Team
