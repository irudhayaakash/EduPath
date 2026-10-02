# EduPath Firebase history model

Each Firebase-authenticated EduPath user is stored under:

`edupath/users/<firebase-user-id>`

The record contains:

- `current` — the active learner workspace. Refresh/New chat clears this area only.
- `history` — every learner profile and analysis, including saved AI Coach conversations.
- `coachThreads` — active coach threads for the current learner.
- `updatedAt` — last sync timestamp.

A History item contains `profile`, `analysis`, `progress`, `notes`, `coachThreads`, `createdAt`, and `updatedAt`.

Selecting an old learner restores their profile, analysis, progress, notes, and coach conversation. Creating a new learner starts a clean current workspace without deleting History.
