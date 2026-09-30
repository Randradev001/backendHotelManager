# Hotel Manager standalone database

Hotel Manager runs in `HotelManagerDB`, independently from `BDAPERP`. It retains the compatible security hierarchy (`USUARIOS`, roles, systems, modules, programs, actions, assignments, credentials and sessions) while containing only Hotel Manager operational data.

Each `g_emp` row is one hotel. Every operational primary and foreign key includes `GECODEMP`; the API obtains that value only from the authenticated session. Canadian accounts require email. `UsuRut` and `UsuDV` are nullable solely for compatibility with older security records.

The repeatable installer is `database/20260904_hotel_manager_standalone.sql`. It never alters or drops `BDAPERP`. It also creates hotel `6002`, administrator `andres.andrade@hotelmanager.test`, six menus and representative maintenance data.

Verification requires successful email login, a session scoped to hotel `6002`, all Hotel Manager menu entries, and tenant-filtered CRUD and dashboard queries.
