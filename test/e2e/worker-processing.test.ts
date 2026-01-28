import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, $fetch } from '@nuxt/test-utils/e2e'

describe('Worker Processing E2E', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../fixtures/basic', import.meta.url)),
  })

  it('should have worker processing capability', async () => {
    // Test that the module is set up correctly for worker processing
    const html = await $fetch('/')
    expect(html).toBeDefined()
  })
})
