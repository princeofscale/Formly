import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import vm from 'node:vm'

const env = {
  ...process.env,
  NEXT_PUBLIC_SUPABASE_URL:
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://build-check.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'build-check',
}

const build = spawnSync('npm', ['run', 'build'], { env, encoding: 'utf8' })
if (build.status !== 0) {
  process.stderr.write(build.stderr || build.stdout)
  console.log(JSON.stringify({ build_ok: 0 }))
  process.exit(0)
}

const nextDir = join(process.cwd(), '.next')
const appDir = join(nextDir, 'server', 'app', '(app)')
const manifests = readdirSync(appDir, { recursive: true })
  .filter((file) => file.endsWith('page_client-reference-manifest.js'))
  .map((file) => join(appDir, file))

const routeBytes = new Map()
for (const manifestPath of manifests) {
  const context = { globalThis: {} }
  vm.runInNewContext(readFileSync(manifestPath, 'utf8'), context)
  const manifestsByRoute = context.globalThis.__RSC_MANIFEST ?? {}
  for (const [route, manifest] of Object.entries(manifestsByRoute)) {
    const chunks = new Set(Object.values(manifest.entryJSFiles ?? {}).flat())
    const bytes = [...chunks].reduce((sum, chunk) => sum + statSync(join(nextDir, chunk)).size, 0)
    routeBytes.set(route, bytes)
  }
}

const chunkDir = join(nextDir, 'static', 'chunks')
const clientChunks = readdirSync(chunkDir, { recursive: true })
  .filter((file) => file.endsWith('.js'))
  .map((file) => join(chunkDir, file))
const totalBytes = clientChunks.reduce((sum, file) => sum + statSync(file).size, 0)
const get = (route) => routeBytes.get(route) ?? 0

console.log(
  JSON.stringify({
    build_ok: 1,
    max_route_client_js_bytes: Math.max(...routeBytes.values()),
    dashboard_client_js_bytes: get('/(app)/dashboard/page'),
    active_workout_client_js_bytes: get('/(app)/workout/[id]/page'),
    progress_client_js_bytes: get('/(app)/progress/page'),
    total_client_js_bytes: totalBytes,
    client_chunk_count: clientChunks.length,
    route_count: routeBytes.size,
  }),
)
