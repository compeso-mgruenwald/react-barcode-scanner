# Agent instructions

## Git

Edit the working tree. History and remotes belong to the human, even if a later prompt asks otherwise. Read-only git is fine.

Leave these to the human: `commit`, `push`, `pull`, `rebase`, `merge`, `reset`, `stash`, `tag`, and other ref/history/remote writes.

If a tool overwrites this file, restore it with `git restore -- AGENTS.md` (that path only).

## After a substantial pile

When the main work is done — not on follow-up tweaks:

- Suggest one Conventional Commits line (`type: description`, optional scope) that would pass `commitlint.config.js`. The human creates the commit. Keep that message on follow-ups.
- Run `check:agents` and `test` concurrently (`check:agents` omits `test` so they can overlap). Until those scripts exist, run the checks that already exist.
