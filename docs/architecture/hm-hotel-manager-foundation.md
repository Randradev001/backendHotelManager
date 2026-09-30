# HM Hotel Manager - Foundation

## Scope

HM Hotel Manager is a new hotel maintenance product. It reuses the existing APERP security implementation, session cookie, role assignments and company selection. It does not reuse GeneXus business data or the APERP Bodega domain.

## Tenant model

One `g_emp` company is one hotel. `GECODEMP` is the hotel identifier and tenant boundary.

The authenticated session is the only authority for the active hotel:

1. `authContext` resolves the session and assigns `req.context.empCod`.
2. Every HM service uses that value as `GECODEMP`.
3. HM endpoints do not accept `GECODEMP` in request bodies, query strings or route parameters.
4. Every HM relation includes `(GECODEMP, EntityId)` so SQL Server cannot join entities from different hotels.

The interface calls this concept **Hotel**, while the database and inherited security retain the compatible `GECODEMP` name.

## Initial tables

| Table | Purpose |
| --- | --- |
| `HMLOCATION` | Hotel hierarchy: building, floor, room, area and equipment room. |
| `HMCATEGORY` | Per-hotel maintenance categories and default priority. |
| `HMASSET` | Maintainable equipment and its hotel/location/category context. |
| `HMWORKORDER` | Primary work order and current operational state. |
| `HMWORKORDERASSIGNMENT` | Assignment history. |
| `HMWORKORDEREVENT` | Append-only operational audit timeline. |
| `HMWORKORDERCOMMENT` | User comments. |
| `HMWORKORDERATTACHMENT` | Metadata for photos, receipts and documents kept in external storage. |

The full idempotent DDL is `database/20260812_hm_foundation.sql`. It is intentionally not applied automatically.

## Work order lifecycle

`NEW` -> `ASSIGNED` -> `IN_PROGRESS` -> `COMPLETED`

An order may move to `ON_HOLD` or `CANCELLED` when authorized. Creating the order, changing status, changing priority, assigning a technician, adding a comment and uploading evidence must append `HMWORKORDEREVENT` rows.

## First API surface

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/hotel-manager/locations` | List locations for the active hotel. |
| `POST` | `/hotel-manager/locations` | Create a location in the active hotel. |
| `GET` | `/hotel-manager/categories` | List active categories. |
| `GET` | `/hotel-manager/work-orders` | Filtered operational queue. |
| `POST` | `/hotel-manager/work-orders` | Create a work order and its `CREATED` event. |
| `GET` | `/hotel-manager/work-orders/:id` | Detail, comments, attachments and audit timeline. |
| `POST` | `/hotel-manager/work-orders/:id/assignments` | Assign a technician. |
| `POST` | `/hotel-manager/work-orders/:id/status` | Authorized state transition. |
| `POST` | `/hotel-manager/work-orders/:id/comments` | Add a comment and audit event. |

## Explicit decisions still required

- The storage provider for photo and receipt files.
- The email migration strategy for existing users while preserving their `UsuLogin` identifier for roles and audit records.
- Permission codes for HM actions before routes are enabled in the authorized menu.
- Offline attachment size and conflict-resolution rules for the PWA.
