# Feature Specification: Task Tracker Core

**Feature Branch**: `001-task-tracker-core`

**Created**: 2026-09-03

**Status**: Draft

**Input**: User description: "this project is called 'procrastinator-tracker' it will be composed of a backend, a frontend, local database. The backend will expose a REST API and an MCP server. The frontend can either be run a single page application, a graphical configurable interface (like storybook) or published as a package which can be added as a dependency to other project in order to render X published components. This solution will allow me to add new todos/tasks, assign them to users, set re-currences, locations, and importantly statuses (to-start, started, in-progress, on-hold, validating, finished). Important to note that some status will have comments associated or additional information. Additionally my solution will also allow to be grouped together, for now just tag based, meaning no hierarchy whatsoever. They will also have a optional scale for urgency associated. The frontend will allow for all obvious interactions, display of information in a simple but light mood fashion, compelling the user to get through the tasks. Any doubts I should clarify with this specification?"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create and progress tasks through statuses (Priority: P1)

As a user, I can create a task and move it through a fixed lifecycle of statuses
(`to-start`, `started`, `in-progress`, `on-hold`, `validating`, `finished`). This is the
heart of the product: everything else supports getting tasks from creation to done.

**Why this priority**: Without the ability to create and progress tasks, nothing else in the
system has value. Every other capability (tags, users, recurrence, comments) is an
enhancement on top of this core loop.

**Independent Test**: Can be fully tested by creating a task, advancing it through every
status in order, and confirming each state change is visible and persisted. Delivers the
primary value: tracking a task to completion.

**Acceptance Scenarios**:

1. **Given** an empty tracker, **When** I create a task with a name, **Then** the task
   appears in the list with status `to-start`.
2. **Given** a task in `to-start`, **When** I mark it started, **Then** its status changes
   to `started` and the change is immediately visible.
3. **Given** a task in `in-progress`, **When** I set it on hold, **Then** its status changes
   to `on-hold` and it is clearly distinguishable from active tasks.
4. **Given** a task in `validating`, **When** I confirm it, **Then** its status changes to
   `finished` and it is moved out of the active working list.
5. **Given** a finished task, **When** I view the tracker, **Then** I can still find it but
   it is not mixed into the active list by default.

---

### User Story 2 - See tasks at a glance and filter by tags (Priority: P1)

As a user, I can view all tasks in a simple, light, motivating interface and narrow the
list using tags (flat grouping with no hierarchy) and status so I know what to work on next.

**Why this priority**: The user explicitly wants a "simple but light mood" display that
"compels the user to get through the tasks". Visibility and filtering are what turn the data
model into an actionable daily view.

**Independent Test**: Can be fully tested by creating several tasks across statuses and
tags, then confirming the view can filter to a single tag/status combination. Delivers value
independently of recurrence, users, or comments.

**Acceptance Scenarios**:

1. **Given** tasks with different statuses, **When** I open the main view, **Then** I see
   active tasks presented first in a clear, lightweight layout.
2. **Given** tasks carrying tags, **When** I select a tag, **Then** only tasks with that tag
   are shown.
3. **Given** a filter selection, **When** I combine a tag and a status, **Then** the view
   shows only tasks matching both.
4. **Given** an empty filter, **When** I clear all selections, **Then** all tasks reappear.

---

### User Story 3 - Assign users, locations, and urgency (Priority: P2)

As a user, I can assign tasks to people, attach an optional location, and set an optional
urgency so work is attributed and prioritized.

**Why this priority**: These fields enrich tasks and enable prioritization, but a tracker
works without them. They are the next-highest value after the core loop and filtering.

**Independent Test**: Can be fully tested by creating a task, assigning a user, setting a
location and an urgency value, then confirming all three are stored and visible.

**Acceptance Scenarios**:

1. **Given** a task, **When** I assign one or more users to it, **Then** those users are
   shown on the task.
2. **Given** a task, **When** I set a location, **Then** the location is shown on the task.
3. **Given** a task, **When** I set an urgency value, **Then** the urgency is displayed and
   higher-urgency tasks stand out.
4. **Given** a task without a location or urgency, **When** I save it, **Then** it is valid
   and both fields simply appear unset.

---

### User Story 4 - Recurring tasks (Priority: P2)

As a user, I can mark a task as recurring (e.g. daily, weekly, monthly) so a next instance
is generated automatically instead of re-creating it by hand.

**Why this priority**: Recurrence removes repetitive manual work, a core frustration the
product exists to solve, but it is still secondary to single-task tracking.

**Independent Test**: Can be fully tested by creating a recurring task, finishing its first
instance, and confirming a new instance appears for the next period without manual action.

**Acceptance Scenarios**:

1. **Given** a task with a daily recurrence, **When** I finish it, **Then** a new instance
   for the next day is created automatically.
2. **Given** a recurring task, **When** I view its details, **Then** I can see its recurrence
   pattern.
3. **Given** a recurring task, **When** I stop its recurrence, **Then** no further instances
   are generated.
4. **Given** an unfinished recurring instance, **When** its period passes, **Then** the
   system handles the overdue instance without creating duplicates.

---

### User Story 5 - Comments and notes on statuses (Priority: P3)

As a user, I can attach comments or additional information to a task, especially when a task
is `on-hold` or `validating`, so context is captured at the right moment.

**Why this priority**: This preserves useful context but is additive; the product works
without it.

**Independent Test**: Can be fully tested by adding a comment to an `on-hold` task and a
note to a `validating` task, then confirming both are stored and readable in the task
details.

**Acceptance Scenarios**:

1. **Given** a task in `on-hold`, **When** I add a comment explaining why, **Then** the
   comment is stored and visible in the task details.
2. **Given** a task in `validating`, **When** I add validation notes, **Then** the notes are
   stored and visible.
3. **Given** a task in any status, **When** I open it, **Then** I can read all comments in
   chronological order.

---

### User Story 6 - Use the tracker through the web app (Priority: P3)

As a user, I can use the tracker through a single-page web application, with the option to
later add a configurable showcase of its components and a publishable package for reuse in
other projects.

**Why this priority**: The web app delivers the core value on its own; the showcase and
publishable package are future distribution modes explicitly deferred beyond v1.

**Independent Test**: Can be fully tested by performing all core task interactions
(create, update status, comment) entirely through the web application and confirming
consistent results.

**Acceptance Scenarios**:

1. **Given** the tracker, **When** I use the web application, **Then** I can perform all
   core task interactions.
2. **Given** a component-based frontend, **When** the showcase or package is later added,
   **Then** no rework of the core interactions is required.

---

### Edge Cases

- What happens when a task is set to `on-hold` without a reason comment?
- How does the system behave when a recurring task is overdue and a new instance is due?
- What happens when a task with comments, tags, and assignees is deleted?
- Can a `finished` task be reopened into `in-progress`?
- How are duplicate or case-differing tags handled?
- What happens when an urgency value is set outside the allowed scale?
- What happens when a task with no tags or users is saved?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST allow creating a task with a name and optional description.
- **FR-002**: The system MUST assign every task one status from the fixed set:
  `to-start`, `started`, `in-progress`, `on-hold`, `validating`, `finished`.
- **FR-003**: The system MUST allow changing a task's status and MUST persist the change
  immediately.
- **FR-004**: The system MUST allow assigning one or more users to a task, where users are
  lightweight local user labels (named people defined within the app, with no accounts or
  authentication).
- **FR-005**: The system MUST allow tagging a task with one or more flat tags (no hierarchy)
  and MUST allow grouping/filtering by tag.
- **FR-006**: The system MUST allow setting an optional location on a task.
- **FR-007**: The system MUST allow setting an optional urgency value on a fixed numeric
  scale (1-5) and MUST surface higher urgency visually.
- **FR-008**: The system MUST support recurrence patterns (e.g. daily, weekly, monthly) and
  MUST auto-generate a new task instance for each occurrence, so every period is its own
  trackable task.
- **FR-009**: The system MUST allow attaching comments/notes to a task, readable in
  chronological order, and MUST support them specifically on `on-hold` and `validating`
  statuses.
- **FR-010**: The system MUST allow listing, filtering, and sorting tasks by status, tag,
  assignee, urgency, location, and recurrence.
- **FR-011**: The system MUST provide a simple, lightweight, motivating view of tasks with
  active tasks presented first and finished tasks separated.
- **FR-012**: The system MUST persist all task data locally so nothing is lost on restart.
- **FR-013**: The system MUST expose task operations (create, read, update, progress,
  comment) through a REST API.
- **FR-014**: The system MUST expose task operations through an MCP server for use from
  external tools.
- **FR-015**: The frontend MUST be delivered as a single-page application as the primary
  mode for v1. A configurable showcase and a publishable component package are explicitly
  deferred beyond v1 but the frontend SHOULD be structured so they can be added later
  without rework.

### Key Entities *(include if feature involves data)*

- **Task**: The core unit of work; has a name, description, status, optional location,
  optional urgency, optional recurrence, and a collection of comments.
- **User**: A named person (lightweight local label, no account or authentication) who can
  be assigned to tasks.
- **Tag**: A flat label applied to tasks for grouping/filtering; no hierarchy.
- **Status**: A fixed enum (`to-start`, `started`, `in-progress`, `on-hold`, `validating`,
  `finished`) that defines the task lifecycle.
- **Recurrence**: An optional pattern that produces new task instances over time.
- **Comment**: Text (and related metadata) attached to a task, associated with a status,
  shown in chronological order.
- **Location**: An optional free-form place associated with a task.
- **Urgency**: An optional value on a fixed numeric scale used for prioritization.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user can create a task and advance it through all statuses to `finished` in
  under 1 minute.
- **SC-002**: A user can find any task by combining status and tag filters within 3
  interactions.
- **SC-003**: Recurring tasks generate their next instance automatically with zero manual
  duplication.
- **SC-004**: No task data is lost across application restarts under normal usage.
- **SC-005**: Task operations are usable from at least one external tool through the MCP
  server.
- **SC-006**: Tracker components render correctly inside a separate project that consumes the
  published package.
- **SC-007**: The majority of newly created tasks are advanced past `to-start` on the day
  they are created (the motivating view drives progress).

## Assumptions

- The fixed status set is `to-start`, `started`, `in-progress`, `on-hold`, `validating`,
  `finished`, exactly as described.
- Urgency uses a fixed numeric scale of 1-5; unset is a valid, lower-priority state.
- Comments/notes are optional on any status and not hard-required for `on-hold` or
  `validating`, though encouraged.
- Tags are flat with no hierarchy, and grouping is purely tag-based for now.
- Recurrence follows common patterns (daily, weekly, monthly, and similar) unless
  clarified otherwise.
- The backend exposes a REST API and an MCP server, and data lives in a local database, per
  the user's explicit description.
- The frontend is delivered as a single-page web application for v1, structured so a
  configurable showcase and a publishable component package can be added later without
  rework.
- The project targets single-user personal use; users are lightweight local labels, not
  accounts, per the assignment-model clarification.