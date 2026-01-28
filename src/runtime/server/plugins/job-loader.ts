import { defineNitroPlugin } from 'nitropack/runtime'
import { consola } from 'consola'
import { resolve, join } from 'pathe'
import { existsSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { registerJob } from '../utils/jobRegistry'
import { defineJob } from '../utils/defineJob'
import type { JobDefinition } from '../utils/defineJob'

/**
 * Auto-discover and register jobs from server/jobs/ directory
 */
export default defineNitroPlugin(async (nitroApp) => {
  consola.info('🔧 Job loader plugin starting...')

  // Make defineJob available globally for job files
  ;(globalThis as Record<string, unknown>).defineJob = defineJob

  consola.info('✅ defineJob is now available globally')

  // In development, Nitro runs from the project root, but we need to look in the app's server directory
  // Try multiple possible locations
  const possibleDirs = [
    resolve(process.cwd(), 'server/jobs'),
    resolve(process.cwd(), 'playground/server/jobs'),
  ]

  // Add srcDir if available
  if (nitroApp?.options?.srcDir) {
    possibleDirs.push(resolve(nitroApp.options.srcDir, 'server/jobs'))
  }

  let jobsDir: string | null = null
  for (const dir of possibleDirs) {
    if (existsSync(dir)) {
      jobsDir = dir
      break
    }
  }

  if (!jobsDir) {
    consola.warn('⚠️  No server/jobs directory found in any expected location')
    consola.debug('Searched locations:', possibleDirs)
    return
  }

  consola.success(`✅ Found jobs directory: ${jobsDir}`)

  try {
    const files = await readdir(jobsDir)
    const jobFiles = files.filter(file =>
      (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.mjs'))
      && !file.endsWith('.d.ts'),
    )

    for (const file of jobFiles) {
      const filePath = join(jobsDir, file)
      const jobName = file.replace(/\.(ts|js|mjs)$/, '')

      try {
        const jobModule = await import(pathToFileURL(filePath).href)
        const jobDefinition: JobDefinition = jobModule.default

        if (!jobDefinition || typeof jobDefinition.handle !== 'function') {
          consola.warn(`Job file ${file} does not export a valid job definition`)
          continue
        }

        registerJob(jobName, jobDefinition)
        consola.success(`Registered job: ${jobName}`)
      }
      catch (error) {
        consola.error(`Failed to load job ${file}:`, error)
      }
    }
  }
  catch (error) {
    consola.error('Failed to load jobs:', error)
  }
})
