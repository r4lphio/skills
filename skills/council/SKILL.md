---
name: council
description: Run a council review, where reviewers from several model families score an artifact part by part against one shared decision record, vote on each other's proposed changes, and pass it only when every reviewer gives every part the pass score. Use when the user says "council", asks for multi-model scoring or consensus on a mock, plan, spec or design, or wants reviewers to agree instead of pulling in different directions.
---

# Council

A council is a set of read-only reviewers, one **seat** per model family, that must
**converge**: one decision record, one brief, a reconcile vote, and a pass only at
**unanimous** scores. Builders change the artifact. Reviewers never do.

Open a todo list with one entry per step before you start.

## 1. Frame

- Name the **artifact** and split it into **parts** (page groups, sections, screens).
  Each part gets its own score.
- Find or write the **decision record**, a file beside the artifact that every seat
  and builder reads first. It holds settled decisions, the words to use, and the
  rules. A seat never marks a part down for following it. To change a record entry,
  a seat writes a proposal with the reason, and the user decides.
- Done when the artifact, the parts and the record path are written in the todo list.

## 2. Seat the council

1. Run `scripts/council-seats`. It prints every seat with `enabled`, `cli_on_path` and
   `remaining_percent`, plus `pass_score`, `low_usage_percent`, `max_rounds` and
   `min_seats`. The user's file `~/.config/council/members.json` overrides the
   defaults; seats merge by `id`, so a user turns a seat off with `"enabled": false`
   or adds a new family with a new `id`.
2. Drop each seat with `enabled: false`.
3. Check that each remaining seat can run:
   - In T3 Code: call `orchestrator_capabilities`. The seat runs when its
     `t3_provider` is listed with no constraint. Use the seat's `model`; when it is
     null, use the provider's first listed model.
   - Elsewhere: the seat runs when `cli_on_path` is true.
   A seat that cannot run is out. Say which, and why.
4. **Usage gate.** A seat with `remaining_percent` 0 is out; do not ask. List every
   seat whose `remaining_percent` is below `low_usage_percent`, or null. Ask the user
   in one question which of those to use, with each seat's number or "unknown".
   Seat only the ones the user confirms.
5. **Probe** each seat with a one-line task ("Reply with the word OK"). A seat that
   fails the probe is out. A catalog can call a provider signed out when it works,
   and the reverse.
6. With fewer than `min_seats` seats left, stop and ask the user.

A seat that runs out at any later step (a usage or rate-limit error, or no reply
after one retry) leaves the council. The council goes on without it: its earlier
scores no longer count toward the pass, and the final table names it as out. Stop
and ask the user only when fewer than `min_seats` seats are left.

Label each seat by family and model, for example `Seat: GPT 6.1 Sol`.

## 3. Score

Commit the artifact, then send every seat the same brief from
`references/briefs.md` ("Score brief"), in parallel. Keep each seat off the
artifact:

- In T3 Code: `delegate_task` with `isolation: "worktree"`, so a stray edit lands in
  the seat's own checkout, and a new `clientRequestId` per seat and round.
- Elsewhere: the seat's `cli` command, which runs in a read-only or plan mode.

Save each reply in `reviews/round<N>/<seat-id>.md` beside the artifact. Ignore any
file a seat changed.

A reply without its JSON block gets one retry that says the reply must contain it.

## 4. Reconcile

Send every seat the "Reconcile brief" with all of this round's reviews. Each seat
answers every proposed change: agree, disagree with the reason, or covered.

- A change goes to the builders when most seats agree and it fits the record.
- A split, or a change that conflicts with the record, goes to the user.
- Add each settled answer to the decision record, so the next round starts from it.

Save the votes in `reviews/round<N>/reconcile.md`.

## 5. Build

Builders apply the agreed changes. When several builders work in parallel, give each
one its own files. Then rebuild or republish the artifact.

## 6. Repeat or present

Go back to step 3 until every seat scores every part at `pass_score` or more. After
`max_rounds` rounds, stop and show the user what still splits the council.

When it passes, show the user one table: a row per part, a column per seat, and
the lowest score in each row. Name each seat that sat out or ran out, and why.
