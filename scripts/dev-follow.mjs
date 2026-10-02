// `pnpm dev`, plus a `git pull` of the current branch every 10 seconds, so changes pushed to it show up in the open
// page by themselves (Vite reloads what changed). Dependencies are reinstalled when the lockfile changes.
import { execSync, spawn } from 'node:child_process'

const run = cmd => execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
const lockfile = () => run('git rev-parse HEAD:pnpm-lock.yaml')

const vite = spawn('pnpm', ['dev'], { stdio: 'inherit' })
vite.on('exit', code => process.exit(code ?? 0))

let lock = lockfile()
setInterval(() => {
  try {
    const before = run('git rev-parse HEAD')
    run('git pull --ff-only --quiet')
    if (run('git rev-parse HEAD') === before) return
    console.log(`\n↓ ${run('git log -1 --format=%s')}`)
    if (lockfile() !== lock) {
      lock = lockfile()
      execSync('pnpm install', { stdio: 'inherit' })
    }
  } catch (e) {
    // Offline, or local edits in the way: say so once per failure and keep serving.
    console.log(`\ngit pull failed: ${String(e.stderr || e.message).split('\n')[0]}`)
  }
}, 10_000)
