import { defineNuxtPlugin } from '#app'

// This plugin is intentionally empty
// Users should use the useQueue() composable directly instead of $queue
// The composable works in both client and server contexts
export default defineNuxtPlugin(() => {
  return {}
})
