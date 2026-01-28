#!/usr/bin/env node
import { defineCommand, runMain } from 'citty'

const main = defineCommand({
  meta: {
    name: 'nuxt-queuekit',
    version: '1.0.0',
    description: 'Nuxt Queue CLI',
  },
  subCommands: {
    worker: () => import('./worker').then(r => r.default),
  },
})

export default main

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMain(main)
}
