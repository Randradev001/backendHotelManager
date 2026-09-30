# Work order tasks

`HMWORKORDERTASK` is the level-two collection for `HMWORKORDER`. It is not an independent master. Its composite tenant keys and foreign key include `GECODEMP`, so a task cannot be linked to a work order from another hotel.

Each row stores a required task description, workflow status (`TODO`, `IN_PROGRESS`, `COMPLETED`, or `CANCELLED`), optional responsible hotel user, and display order. The work-order create/edit form sends the collection as `tasks`; `PUT /hotel-manager/work-orders/:workOrderId/tasks` supports later assignment and progress changes from the register action.

The responsible user is deliberately nullable. When supplied, the backend verifies that the login is active in the authenticated hotel. The browser never supplies or overrides `GECODEMP`.

A work order cannot enter `COMPLETED` unless every child task is exactly `COMPLETED`. Conversely, an order with tasks cannot enter `IN_PROGRESS` when all its tasks are already closed; at least one must be `TODO` or `IN_PROGRESS`. These invariants are enforced for board transitions, register transitions, and direct work-order edits.

Status transitions may include the edited task collection. Task changes and the header transition are committed in the same SQL transaction, allowing staff to close the remaining tasks directly inside the Change Status dialog before completing the work order.
