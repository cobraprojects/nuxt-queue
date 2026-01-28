import { getAllJobs } from '../../../src/runtime/server/utils/jobRegistry'

export default defineEventHandler(() => {
  const jobs = getAllJobs()
  return {
    registeredJobs: Array.from(jobs.keys()),
    count: jobs.size,
  }
})
