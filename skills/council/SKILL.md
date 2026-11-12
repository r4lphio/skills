---
name: council
description: Run a council review, where reviewers from several model families score an artifact part by part against one shared decision record, vote on each other's proposed changes when they conflict, and pass it only when every reviewer gives every part the pass score. Use when the user says "council", asks for multi-model scoring or consensus on a mock, plan, spec, site or design, or wants reviewers to agree instead of pulling in different directions.
---

# Council

A council is a set of read-only reviewers, one **seat** per model family, that must
**converge**: one decision record, one brief, a vote when changes conflict, and a pass
only at **unanimous** scores. Builders change the artifact. Reviewers never do.

Open a todo list with one entry per step before you start.

## 1. Frame

- Name the **artifact** and split it into **parts** (page groups, sections, screens).
  Each part gets its own score.
- Find or write the **decision record**, a file beside the artifact that every seat
  and builder reads first. It holds what the user asked for, settled decisions, the
  words to use, and the rules. A seat never marks a part down for following it. To
  change a record entry, a seat writes a proposal with the reason, and the user decides.
- Keep the council's files in one folder beside the artifact, for example `.council/`:
  the record, `round-<N>-notes.md`, `round-<N>/` for evidence such as screenshots, and
  `round-<N>/<seat-id>.md` for each review.
- The pass score is `pass_score` unless the user names one ("until it's a 9").
- Done when the artifact, the parts, the pass score and the record path are written in
  the todo list.

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
4. **Usage gate.** A seat with `remaining_percent` 0 is out; do not ask. Every seat whose
   `remaining_percent` is below `low_usage_percent`, or null, goes in **one question**
   to the user, with each seat's number or "unknown". Seat only the ones the user
   confirms. Never drop such a seat on your own: a council that quietly shrinks to
   two seats is not the council the user asked for.
5. **Round cap.** When the user asks to run until the work passes, put `max_rounds` in
   the same question: "I stop after <max_rounds> rounds and show what still splits the
   council. Give a higher cap, in rounds or hours, to run longer." A long run without a
   cap spends hours on the last point.
6. **Probe** each seat with a one-line task ("Reply with the word OK"). A seat that
   fails the probe is out. A catalog can call a provider signed out when it works,
   and the reverse.
7. With fewer than `min_seats` seats left, stop and ask the user.

Usage changes during a long council. Run `scripts/council-seats` again before each
round. A seat that drops under `low_usage_percent` sits out that round, and you ask the
user whether it stays. A seat that runs out at any step (a usage or rate-limit error,
or no reply after one retry) leaves the council. The council goes on without it: its
earlier scores no longer count toward the pass, and the scoreboard names it as out.
Stop and ask the user only when fewer than `min_seats` seats are left, unless the user
already said to go on with fewer.

Label each seat by family and model, for example `Seat: GPT 6.1 Sol`.

## 3. Score

Each round reviews **one frozen build**. Commit it, and write `round-<N>-notes.md`: the
commit or build each seat must review, how to open it, the evidence in `round-<N>/`,
each seat's scores from the last round, and what changed since then. Seats check that
earlier faults are fixed before they look for new ones.

Send every seat the "Score brief" from `references/briefs.md`, in parallel and in the
background. Keep each seat off the artifact:

- In T3 Code: `delegate_task` with `isolation: "worktree"`, so a stray edit lands in
  the seat's own checkout, and a new `clientRequestId` per seat and round.
- Elsewhere: the seat's `cli` command, which runs in a read-only or plan mode.

Do not poll. Each seat's finished task starts your next turn. While one seat still
reviews, you may fix the faults another seat sent, on a separate copy. Never rebuild the
frozen build during a review: a seat that reads a newer build scores the wrong thing.

Save each reply in `round-<N>/<seat-id>.md`. Ignore any file a seat changed. A reply
without its JSON block gets one retry that says the reply must contain it.

## 4. Reconcile

Collect every proposed change. When no two changes conflict and none conflicts with the
record, they all go to the builders; skip the vote.

Otherwise send every seat the "Reconcile brief" with all of this round's reviews. Each
seat answers every proposed change: agree, disagree with the reason, or covered.

- A change goes to the builders when most seats agree and it fits the record.
- A split, or a change that conflicts with the record, goes to the user.
- Add each settled answer to the decision record, so the next round starts from it.

Save the votes in `round-<N>/reconcile.md`.

## 5. Build

Builders apply the agreed changes. When several builders work in parallel, give each
one its own files. Turn each fixed fault into a check in the project's tests, so a
later round cannot break it again without a failure. Run the full test suite on the
new build before the next round, with nothing else running on the machine, and commit
only when it passes. The commit is the next round's frozen build.

## 6. Report, then repeat or present

After each round, post the **scoreboard**: one row per round, one column per seat, each
seat's scores in part order, and the parts still under the pass score. Below it, say
what is done, what is not committed, and what is next. Keep it short enough to read on
a phone.

Go back to step 3 until every seat scores every part at the pass score or more. At the
round cap, stop and show the user what still splits the council.

When it passes, show the user one table: a row per part, a column per seat, and the
lowest score in each row. Name each seat that sat out or ran out, and why. Push,
publish or deploy nothing without the user's yes.
