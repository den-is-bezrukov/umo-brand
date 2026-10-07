---
name: ship
description: Commit and deploy umo-brand to production (umo.autos) the way the user expects — descriptive commits with Figma node ids, AGENTS.md kept in sync, trials as separate revertible commits; before a push gather all unpushed work across branches and worktrees, check other chats and conflicts with prod, then push to main, watch the deploy, offer cleanup. Use when the user says «пушим», «пуш», «пушь на прод», «комитим и пушим», «давай в прод», «выкатываемся», «собираем всё и пушим», «что не запушено», «проверь конфликты», «откати», «верни как было», or asks to try a variant they may roll back.
---

# Ship to umo.autos

A push to `main` is a production deploy (`.github/workflows/deploy.yml` → GitHub Pages). «Пушим» is the go-ahead for exactly that: commit, push to `main`, confirm the deploy. It covers the work discussed up to now, not later changes.

Never push without that word. Commit finished pieces locally as you go (commits publish nothing) and don't end every small edit with «запушить?»; offer the push once when a series of edits is done.

## Before committing

1. `pnpm build` passes (tsc + vite). No image over 2.5 MB, no video over 15 MB under `src/` or `public/`: CI and the deploy fail on them.
2. **AGENTS.md describes what you changed**: new behaviour, numbers, Figma node ids, why a non-obvious choice was made. It is the project's memory; every past session kept it current.
3. Downloads touched? The sizes come from `virtual:download-sizes` automatically. Copies such as `public/downloads/umo-favicon.*` match their sources.
4. Stage only your files. `.claude/settings.local.json` and scratch screenshots stay out (a test screenshot was once committed by mistake).

## Commit style

Subject: `Area: what changed, in plain words`, e.g. `Guide contents: -8px margins tuck the first and last items' padding under the logo and the toggle row (Figma 4865:1025)`. Areas: `Guide`, `Guide contents`, `Guide hero`, `Livery`, `Livery UMO 5`, `Price card`, `Favicon`. Body: short bullets on the why, when it isn't obvious. End with the attribution line from the system reminder.

## Trials and rollbacks

- An experimental variant (a colour, a hover, a motion) goes in **its own commit**, marked `(a trial)` or `(a trial; revert this commit to go back)`. «Откатывай» then becomes one `git revert`, and «далеко откатил, я имел в виду только последний ран» can't happen.
- When the user says to go back to what's in production, diff against `origin/main` or look at https://umo.autos rather than reconstructing it from memory.

## Gather everything before a push

Several chats work in this repo at once, often in the same folder and branch, and commit as they go. So before «пушим» turns into a push, find out what there is to ship, and whether it's finished:

1. `git fetch origin` (it sometimes fails with an SSL error: just run it again; never judge «what's on prod» from a stale `origin/main`).
2. **Unpushed work everywhere**: `git log origin/main..HEAD`, every worktree's `git status --short` (`git worktree list`), and every local or remote branch with commits not in `origin/main` (`git rev-list --count origin/main..<branch>`). A forgotten branch with a real commit (a filter left in a worktree for a day) is asked about, not silently left behind or silently shipped; a branch whose content is already on prod (same files as `origin/main`) is just stale.
3. **Is someone still writing?** `list_sessions` (the `ccd_session_mgmt` tool): a session with `isRunning: true` in this repo, or a commit in the last minute or two, means another chat is mid-work. Say so and ask rather than push its half-done state.
4. **Conflicts with prod**: `git merge-tree --write-tree HEAD origin/main`. When prod has commits the branch lacks (often the same change cherry-picked under other hashes, as the Metrika commits were), merge `origin/main` in, resolve, and check the result builds; a push of a branch behind prod is rejected anyway. In a conflict keep both sides' meaning; in AGENTS.md take the current text and re-apply the other side's edits to it, since both sides usually rewrote the same long paragraph.
5. Build and file sizes as in «Before committing», on the merged result.
6. Uncommitted files: only `.claude/launch.json` is expected (gitignored now); anything else is someone's unfinished work. Ask.

Then push, watch the deploy, and report: a short grouped list of what went out (generators, guide, links that now open differently), anything left behind and why. After the push, offer to remove worktrees whose branches are now in `origin/main` (`git worktree remove`, `git branch -d`); remove only on a yes.

## Push and confirm

Work happens on a `claude/*` branch in a worktree. Bring it up to date with the base branch first (the `sync_with_base_branch` tool when available), then push to `main`:

```bash
git push origin HEAD:main
```

Then wait for the deploy run of the commit just pushed and report its result with the URL. Name the workflow (the latest run on `main` may be CI) and the commit: right after a push the new run may not be listed yet, and the latest one is then the previous deploy, already green:

```bash
sha=$(git rev-parse HEAD); for i in 1 2 3 4 5 6; do id=$(gh run list --workflow deploy.yml --commit "$sha" --limit 1 --json databaseId -q '.[0].databaseId'); [ -n "$id" ] && break; sleep 10; done
gh run watch "$id" --exit-status
```

If it fails, read the log (`gh run view --log-failed`), fix and push again, then tell the user what broke.
