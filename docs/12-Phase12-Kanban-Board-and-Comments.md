# Phase 12 — Kanban Board and Comments

> Status: **✅ Verified — approved 2026-11-28**. Builds on [Phase 11 — Task management](11-Phase11-Task-Management.md).
> Try it: **Workspace › Board** (pick a project) or a project's **Board** tab; comments are on every task's page.

## 1. What this phase does, in simple words

- **Board:** a project's tasks in status columns. A card moves when you drag it, use the keyboard, or choose
  **Move to…**. The card moves at once and goes back (with an explanation) if the API refuses.
- **Comments:** the discussion under a task. You can read, add (Ctrl + Enter), edit your own and delete, each
  as the backend allows.

## 2. The backend contract (read from the code)

**Board.** There is no board endpoint. Each column is `GET /api/tasks?ProjectId=&Status=` (Phase 1 §9), and a
move is `PATCH /api/tasks/{id}/status`. The workflow and rights are the ones from Phase 11.

**Comments** (`CommentsController`, `CommentService`, `CommentAuthorizationHandler`):

| Endpoint | Who | Notes |
|---|---|---|
| `GET /api/tasks/{taskId}/comments` | anyone who can see the task | paged, **oldest first** |
| `POST /api/tasks/{taskId}/comments` | any project member, **verified email** | 1–2000 characters, trimmed; task not visible → 404 |
| `PUT /api/comments/{id}` | the **author only** (still a member), verified | **not even an Admin**: "nobody may put words in someone else's mouth". Sets `updatedAtUtc` (= "edited") |
| `DELETE /api/comments/{id}` | the author (still a member), the **project owner** (moderation) or an **Admin**, verified | |

## 3. How it works

### 3.1 Columns: one query each
`/board` is a **project picker** (boards belong to projects). `/projects/:id/board` shows four columns: To do,
In progress, In review and Done. **Show cancelled** adds the fifth (gap G7). Each column is its own query: the
project, the status, the shared filters (search, assignee, priority, all in the URL), most urgent first, 50
cards. "Load more" grows a column to 100 (the API's limit), and beyond that it links to the full list.

### 3.2 Moving a card: optimistic, with rollback (docs/02 §14)
```
drop / "Move to…" → allowed? (workflow + rights; forbidden = nothing happens, no API call)
  onMutate:  cancel the two column queries · snapshot them · move the card in the cache (priority order)
  PATCH /api/tasks/{id}/status
  onError:   restore the snapshots (card jumps back) · toast "Can't move "X" to Done" + the API's reason
  onSettled: refetch task lists, dashboard, projects: the server has the last word
```
The card is inserted where the server will put it (by priority), so it doesn't jump when the refetch arrives.

### 3.3 Three ways to move (no one is left out)
| Way | For | How |
|---|---|---|
| Pointer drag | mouse | from the **handle** (⋮⋮), so links and buttons on the card stay normal controls |
| Touch drag | phones/tablets | **long-press 250 ms**, so a plain swipe still scrolls the board |
| Keyboard drag | keyboard + screen reader | Space picks up, **← / → jump a whole column**, Space drops, Escape cancels |
| **Move to…** menu | everyone (WCAG 2.5.7: dragging must have a single-pointer alternative) | lists only the allowed targets |

While dragging, columns the card can't go to are **dimmed and say "Not allowed"** (text and icon, not just
dimming). The allowed target gets a highlighted border.

**Announcements** (screen readers): *"Picked up Write homepage copy from In progress. It can move to: To do,
In review, Cancelled."* → *"Over Done: not allowed."* → *"Write homepage copy moved to In review."*

**Focus follows the card.** A moved card is re-created in its new column, so the focused handle disappears. The
board puts focus back on the moved card (its handle, or its link if it can't move further).

### 3.3b Which features may use which (still no import cycles)
`board` and `comments` sit on top: they use `tasks`, `projects` and `auth`, and nothing uses them except the
router and the task page (comments). `@/features/tasks` now also exports `DueDate` and its permission rules,
which are leaf modules.

### 3.4 Comments
- Oldest first, 20 at a time ("Show more comments (n)"), using `useInfiniteQuery` so all loaded pages share one
  cache key.
- Adding refetches the loaded pages (the new comment's position depends on how many exist). Editing and
  deleting update the cache in place.
- **Rights mirror the backend exactly:** an Admin sees **Delete** but **not Edit** on someone else's comment, and
  the project owner can moderate. An author who left the project loses both. Nothing without a verified email.
- When the user chooses "Edit", focus moves into the box. That's done explicitly in code, not with `autoFocus`.
- The form shows a character counter, "Ctrl + Enter to send", and server errors under the field or at the top.

## 4. Files

| File | Responsibility |
|---|---|
| `src/features/board/boardColumns.ts` | column query, optimistic insert/remove (priority order) |
| `src/features/board/hooks/useMoveTask.ts` | optimistic move: snapshot, rollback, toast, revalidate |
| `src/features/board/components/KanbanBoard.tsx` | dnd-kit: sensors, column-jump keyboard, collision, drop rules, announcements, overlay, focus |
| `src/features/board/components/BoardColumn.tsx`, `TaskCard.tsx` | droppable column ("Not allowed"), card + handle + "Move to…" |
| `src/features/board/pages/BoardPage.tsx`, `ProjectBoardPage.tsx` | project picker; board with URL filters |
| `src/features/comments/*` (new) | API, `commentRules`, infinite query + mutations, `CommentsSection`, `CommentItem`, `CommentForm` |
| `src/features/tasks/index.ts` | + `DueDate`, permission rules (leaf modules) |
| `src/features/tasks/pages/TaskDetailsPage.tsx` | comments instead of the placeholder |
| `src/features/projects/…` | removed `ProjectBoardPage` / `ProjectTabPlaceholder` (the route loads the board feature) |

## 5. Problems found and fixed

| # | Found by | Problem | Fix / lesson |
|---|---|---|---|
| 1 | Step-by-step trace | **Focus lost after a move** (card re-created elsewhere) | Put focus back on the moved card once it appears; tested in integration and E2E |
| 2 | Step-by-step trace | The "Picked up…" announcement was immediately replaced by "back over To do" | Stay quiet while the card is still over its starting column |
| 3 | E2E (keyboard) | Drop pressed in the same instant as the arrow landed on the old column | Not a code bug: dnd-kit updates the target on the next render. The test now waits for each announcement, as a screen-reader user does. **Lesson:** I first tried an unrelated fix (measuring strategy), checked it, and reverted it because it wasn't the cause |
| 4 | Screenshot (phone) | The **whole page** scrolled sideways on the board | (a) the page grid sized to the board: `grid-cols-1` (= `minmax(0,1fr)`); (b) `sr-only` texts (absolute) escaped the scroller's clipping: the scroller is now `relative`. A test checks every viewport |
| 5 | jsx-a11y | `autoFocus` on the edit box | Explicit focus on the user's action |

## 6. Tests

| Level | File | Tests | Covers |
|---|---|---|---|
| Unit | `features/board/boardColumns` | 3 | column query, remove (count), insert in priority order |
| Unit | `features/comments/commentRules` | 6 | author, owner, **Admin delete-only**, other member, ex-member, unverified |
| Integration | `board.test.tsx` | 8 | 4 columns / 4 queries, Cancelled toggle + URL; **optimistic move** (held server answer); **focus after move**; **409 rollback** + toast; moves per role (no handle for others, no reopen for assignee); assignee filter on all columns; Load more → 100; picker |
| Integration | `comments.test.tsx` | 8 | oldest first, count, "edited"; Show more (page 2); add with Ctrl+Enter, empty refused; author edit (focus); Admin delete-not-edit; owner moderation + confirm; 403 message; unverified |
| **Vitest total** | 59 files | **454** (+25) | ✅ |
| E2E (UI) | `board.spec.ts` | 4 × 3 (pointer drag: desktop only) | **pointer drag** with "Not allowed" while dragging; **keyboard drag** with announcements and focus; Move to… on every viewport; **no sideways page scroll**; comments add/edit/delete; **axe** light + dark |
| **Playwright UI total** | | **130** (+2 skipped: pointer drag on tablet/phone) | ✅ 2 consecutive full runs |
| E2E (real API) | `backend/board-comments.backend.spec.ts` | 1 + 1 | regular user: unverified comment → 403, verified → 404 (task not visible). Admin flow (real board move survives reload; member comments; Admin sees Delete not Edit, **API PUT → 403**, moderation delete) runs with `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` |
| **Real API total** | | **7 passed, 4 skipped** | ✅ (admin flows need credentials) |

## 7. Common mistakes and best practices

| Mistake | Better |
|---|---|
| Drag as the only way to move | A menu that does the same (touch, keyboard, motor impairments) |
| Dimming forbidden targets only | Say it: "Not allowed" (text + icon) |
| Dropping anywhere, letting the API refuse | Don't call the API for forbidden moves; still handle 409/403 for races |
| Optimistic update without snapshot | Snapshot → move → restore on error → revalidate |
| Losing focus when an element moves | Move focus to the element's new place |
| `overflow-x: auto` without a containing block | Absolute descendants escape the clipping: make the scroller `relative` |
| Admin can do everything | Not here: editing someone's words is author-only, by design |

## 8. Interview questions
1. Walk through an optimistic update. What exactly do you snapshot, and when do you revalidate?
2. Why insert the moved card in priority order rather than at the top?
3. How does a keyboard user move a card? How does a screen-reader user know what happened?
4. What does WCAG 2.5.7 require for drag-and-drop interfaces?
5. Why start a touch drag only after a long-press?
6. Why may an Admin delete but not edit a comment?
7. Why does an absolutely positioned child escape `overflow: auto`, and how do you fix it?
8. When is `useInfiniteQuery` better than one query per page?
9. Why would a drop pressed "too fast" land in the old column, and is it a bug?

## 9. Practical exercises
1. Show a comment count on each card. Which endpoint would give it cheaply? (There's none: what would you add
   to the backend?)
2. Add an "Assigned to me" quick filter to the board toolbar.
3. Let the board remember the last project in `localStorage` and open it from `/board`.
4. Add Undo to the "Moved to In progress" flow for 5 seconds. What must happen if the user leaves the page?
5. Allow Markdown in comments safely. What must never happen to the rendered HTML?
