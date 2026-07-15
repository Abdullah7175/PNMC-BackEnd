# Message for Mobile App Developer — Province / District Org Assignment

Hi,

**Org model change (please update the app):**

| Role | Scope |
|------|--------|
| **Province supervisor** (portal) | One province — reviews only inspections from that province |
| **Mobile inspector** | One district under that province — creates inspections only in their district |

---

## New API (required)

```
GET /api/v1/mobile/assignment
Authorization: Bearer <accessToken>
```

Call this after login (or on app start). It returns the inspector’s province, district, and the **supervisor(s)** for that province.

### Example response

```json
{
  "scope": "district",
  "provinceId": "uuid",
  "districtId": "uuid",
  "province": { "id": "uuid", "name": "Sindh", "code": "SD" },
  "district": {
    "id": "uuid",
    "name": "Karachi Central",
    "code": null,
    "provinceId": "uuid"
  },
  "supervisors": [
    {
      "id": "uuid",
      "fullName": "Senior Inspector",
      "email": "supervisor@pnmc.gov.pk",
      "phone": null,
      "designation": null,
      "employeeId": "SUP-2026-0001"
    }
  ],
  "message": "You work under your assigned district; inspections must use this district."
}
```

`scope` values: `"district"` | `"province"` | `"unassigned"`

---

## Login / me profile (extra fields)

`user` from login / refresh / `GET /auth/me` now also includes:

- `provinceId` (UUID or null)
- `districtId` (UUID or null)

Keep using `province` / `district` names for display.

---

## Lookups are scoped

Existing lookup routes are unchanged in path, but data is **limited to the inspector’s assignment**:

| Endpoint | Behaviour |
|----------|-----------|
| `GET /mobile/lookups` | Only assigned province (+ only assigned district if set) |
| `GET /mobile/lookups/provinces` | Only assigned province |
| `GET /mobile/lookups/provinces/:provinceId/districts` | Only districts allowed for this user |

`lookups` also returns `assignmentScope` and `note`.

---

## Create inspection

`POST /mobile/inspections`

- Backend **auto-fills** `provinceId` / `districtId` from the user’s assignment when the inspector is locked to a district.
- Sending a **different** province/district returns **403**.
- If only province is assigned (no district), you **must** send a `districtId` inside that province.

**Recommended UX:** hide province/district pickers when `scope === "district"` and show assignment from `GET /mobile/assignment`.

---

## Demo account (unchanged password)

- Email: `inspector@pnmc.gov.pk`
- Password: `Field@123`
- Assigned: **Sindh → Karachi Central** (after seed / migration backfill)

---

Thanks — this is the only change set for org assignment. No other mobile routes changed besides scoping create/lookups and adding `/mobile/assignment`.
