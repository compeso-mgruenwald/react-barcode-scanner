# Agent instructions

## Git

Edit the working tree. History and remotes belong to the human, even if a later prompt asks otherwise. Read-only git is fine.

Leave these to the human: `commit`, `push`, `pull`, `rebase`, `merge`, `reset`, `stash`, `tag`, and other ref/history/remote writes.

If a tool overwrites this file, restore it with `git restore -- AGENTS.md` (that path only).

## Code

- Bindings use `let`, even when they never change.
- Constants use `const` and UPPER_SNAKE_CASE.
- Named functions are declarations: `function foo()`. Keep arrows for callbacks.
- Leave return types to inference. Exported functions keep one (`isolatedDeclarations`).
- Named exports: `export function foo()`. Skip `export default` unless the tool requires it.

## After a substantial pile

When the main work is done — not on follow-up tweaks:

- Suggest a Conventional Commits message that would pass `commitlint.config.ts`. The human creates the commit. Offer it once for the pile.
  Prefer a subject plus a body unless the change is one short sentence. Subject is `type: description` (optional scope). Body is an unordered markdown list; each item stays on one line.
- Run `check:agents` and `test` concurrently (`check:agents` omits `test` so they can overlap).
