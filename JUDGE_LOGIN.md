# KAAMSABHA judge login note

These deterministic accounts are for the synthetic SIH26089 demonstration. They contain no real people, payments or service records. The normal application does not display these passwords.

| Role | User ID | Password | Opens |
|---|---|---|---|
| Customer | `customer01` | `Customer@26089` | `/customer` |
| Worker-member | `meena01` | `Member@26089` | Meena / W01 |
| Worker-member | `ravi01` | `Member@26089` | Ravi / W02 |
| Worker-member | `salim01` | `Member@26089` | Salim / W03 |
| Worker-member | `sunita01` | `Member@26089` | Sunita / W04 |
| Worker-member | `anil01` | `Member@26089` | Anil / W05 |
| Cooperative admin | `admin01` | `Admin@26089` | `/operations` |

The remaining seeded workers use the same worker-member password with User IDs `farida01`, `suresh01`, `priya01`, `rahul01`, `asha01`, `imran01`, and `neha01`.

For connected mode, apply migrations and run `npm run seed:auth` with `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and the three `DEMO_*_PASSWORD` variables. Supabase Auth then owns password hashing and sessions. Without Supabase configuration, the app clearly labels the device-local fallback and validates the same accounts against PBKDF2 proofs.

Use logout to change roles. Direct cross-role URLs redirect to the signed-in role's home. The isolated `/demo` route remains available without signing in.
