import { defineNitroPlugin } from 'nitropack/runtime'
import { consola } from 'consola'
import { resolve, join, relative } from 'pathe'
import { existsSync, statSync } from 'node:fs'
import { readdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { registerJob } from '../utils/jobRegistry'
import { defineJob } from '../utils/defineJob'
import type { JobDefinition } from '../utils/defineJob'

// Import useRuntimeConfig from #imports
import { useRuntimeConfig } from '#imports'

/**
 * Recursively scan directory for job files
 */
async function scanJobFiles(dir: string, baseDir: string): Promise<Array<{ path: string, name: string }>> {
  const results: Array<{ path: string, name: string }> = []

  try {
    const entries = await readdir(dir)

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        // Recursively scan subdirectories
        const subResults = await scanJobFiles(fullPath, baseDir)
        results.push(...subResults)
      }
      else if (stat.isFile()) {
        // Check if it's a valid job file
        if ((entry.endsWith('.ts') || entry.endsWith('.js') || entry.endsWith('.mjs'))
          && !entry.endsWith('.d.ts')) {
          // Get relative path from base directory and use it as job name
          const relativePath = relative(baseDir, fullPath)
          const jobName = relativePath.replace(/\.(ts|js|mjs)$/, '').replace(/\//g, '.')

          results.push({
            path: fullPath,
            name: jobName,
          })
        }
      }
    }
  }
  catch (error) {
    consola.error(`Failed to scan directory ${dir}:`, error)
  }

  return results
}

/**
 * Auto-discover and register jobs from server/jobs/ directory
 */
export default defineNitroPlugin((_nitroApp) => {
  // Make defineJob available globally for job files immediately (synchronous)
  ;(globalThis as Record<string, unknown>).defineJob = defineJob

  // Defer job loading to not block server startup
  // This runs asynchronously after the plugin returns
  setImmediate(async () => {
    consola.info('🔧 Job loader starting...')

    // Get the configured jobs directory from runtime config
    const config = useRuntimeConfig()
    const configuredJobsDir = config.queue?.jobsDir || 'server/jobs'

    // Get jobs from Nitro runtime config (server-only)
    const nitroConfig = useRuntimeConfig()
    const configuredJobs = (nitroConfig as { nuxtQueue?: { configJobs?: Record<string, JobDefinition> } }).nuxtQueue?.configJobs || {}

    // In development, Nitro runs from the project root, but we need to look in the app's server directory
    // Try multiple possible locations
    const possibleDirs = [
      resolve(process.cwd(), configuredJobsDir),
      resolve(process.cwd(), 'playground', configuredJobsDir),
    ]

    let jobsDir: string | null = null
    for (const dir of possibleDirs) {
      if (existsSync(dir)) {
        jobsDir = dir
        break
      }
    }

    if (!jobsDir) {
      consola.warn('⚠️  No jobs directory found in any expected location')
      consola.debug('Searched locations:', possibleDirs)
      return
    }

    consola.success(`✅ Found jobs directory: ${jobsDir}`)

    try {
      const jobFiles = await scanJobFiles(jobsDir, jobsDir)

      consola.info(`📂 Found ${jobFiles.length} job file(s)`)

      for (const { path: filePath, name: jobName } of jobFiles) {
        try {
          const jobModule = await import(pathToFileURL(filePath).href)
          const jobDefinition: JobDefinition = jobModule.default

          if (!jobDefinition || typeof jobDefinition.handle !== 'function') {
            consola.warn(`Job file ${jobName} does not export a valid job definition`)
            continue
          }

          registerJob(jobName, jobDefinition)
          consola.success(`✅ Registered job: ${jobName}`)
        }
        catch (error) {
          consola.error(`❌ Failed to load job ${jobName}:`, error)
        }
      }
    }
    catch (error) {
      consola.error('Failed to load jobs:', error)
    }

    // Register additional jobs from config (appends to auto-discovered jobs)
    if (Object.keys(configuredJobs).length > 0) {
      consola.info(`📝 Registering ${Object.keys(configuredJobs).length} additional jobs from config...`)
      for (const [jobName, jobDefinitionOrPath] of Object.entries(configuredJobs)) {
        try {
          // Check if it's a file path (string) or inline definition (object)
          if (typeof jobDefinitionOrPath === 'string') {
            // It's a file path - load the job from the file
            const jobPath = resolve(process.cwd(), jobDefinitionOrPath)

            if (!existsSync(jobPath)) {
              consola.error(`❌ Job file not found: ${jobPath}`)
              continue
            }

            const jobModule = await import(pathToFileURL(jobPath).href)
            const jobDefinition: JobDefinition = jobModule.default

            if (!jobDefinition || typeof jobDefinition.handle !== 'function') {
              consola.warn(`Job file ${jobName} does not export a valid job definition`)
              continue
            }

            registerJob(jobName, jobDefinition)
            consola.success(`✅ Registered job from file: ${jobName} (${jobDefinitionOrPath})`)
          }
          else {
            // It's an inline definition
            registerJob(jobName, jobDefinitionOrPath as JobDefinition)
            consola.success(`✅ Registered job from config: ${jobName}`)
          }
        }
        catch (error) {
          consola.error(`❌ Failed to register job ${jobName}:`, error)
        }
      }
    }

    consola.success('✅ Job loader completed')
  })
})
