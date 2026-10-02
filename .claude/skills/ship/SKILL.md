---
name: ship
description: Commit and deploy umo-brand to production (umo.autos) the way the user expects — descriptive commits with Figma node ids, AGENTS.md kept in sync, trials as separate revertible commits, push to main, watch the deploy. Use when the user says «пушим», «пуш», «пушь на прод», «комитим и пушим», «давай в прод», «откати», «верни как было», or asks to try a variant they may roll back.
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

## Push and confirm

Work happens on a `claude/*` branch in a worktree. Bring it up to date with the base branch first (the `sync_with_base_branch` tool when available), then push to `main`:

```bash
git push origin HEAD:main
```

Then wait for the deploy run and report its result with the URL:

```bash
gh run watch "$(gh run list --branch main --limit 1 --json databaseId -q '.[0].databaseId')" --exit-status
```

If it fails, read the log (`gh run view --log-failed`), fix and push again, then tell the user what broke.
