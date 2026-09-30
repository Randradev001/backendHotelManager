# HM Email Login

## Business purpose

Hotel Manager is intended for Canadian operations, where Chilean RUT is not an appropriate user-facing sign-in identifier. Authentication now uses the user's email address while retaining `UsuLogin` as the internal GeneXus-compatible security identity.

## Dependencies preserved

- `USUARIOS.UsuCorreo` resolves the identity and assigned hotels.
- `UsuLogin` continues to key `SEGUSUCRED`, `SEGSESION`, roles, permissions and audit records.
- Password verification and the one-time migration from `UsuClave` to the modern hash remain unchanged.
- The authenticated session continues to supply `GECODEMP`; the browser cannot override the hotel context.
- `parseRut` remains available only for legacy user-master validation.

## Verification

- The test hotel user resolves to `andres.andrade@hotelmanager.test` in `GECODEMP 6002`.
- Invalid email input returns HTTP-compatible `400 / VALIDATION_ERROR` before database authentication.
- Backend syntax, targeted frontend lint and the production PWA build pass.
