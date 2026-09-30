# Multi-hotel operations

`HMUSERHOTELACCESS` grants an authenticated user visibility and optional management rights over specific hotels. The browser may request a hotel filter, but every request is resolved against this allow-list; it cannot override the session tenant without an explicit grant.

Work Board supports the authenticated hotel, each authorized hotel, or all authorized hotels. Cross-hotel records carry their hotel identity through drag, task editing, and status transitions, and the backend revalidates management access before mutation.

Users with role `ADMINFULL` receive every active hotel and all work orders by default, with a hotel filter in both Work Board and Work Orders. Non-administrators do not see the filter and remain restricted to their session hotel unless an explicit `HMUSERHOTELACCESS` grant exists for a specialized cross-hotel role.

`HMWORKORDERTASK.ParentTaskId` provides a self-referencing third level for task/subtask trees. Bulk edits recreate the collection while translating parent identifiers, preserving hierarchy and the composite `GECODEMP` boundary.

The repeatable demo migration `database/20260904_hm_multi_hotel_demo.sql` creates six Manitoba hotels. It adds 23 Colonial Inn room-renovation orders with six tasks each, Clarion Lakeside carpet replacement across five floors, and Courtis Winnipeg demolition, conveyor installation, and furniture assembly with three parent tasks and 69 room subtasks. All orders start `NEW`; all tasks start `TODO`; assignments are empty.

`database/20260904_hm_demo_workers.sql` creates the six demonstration maintenance workers in every demo hotel. They inherit Dashboard, Work Orders, and Work Board access through the `TECHNICIAN` role and can be selected as work-order or task responsible users within each hotel's tenant boundary.
