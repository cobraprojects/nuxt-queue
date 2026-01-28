import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/module',
    'src/cli',
  ],
  externals: [
    '@nuxt/kit',
    '@nuxt/schema',
    'nuxt',
    'citty',
    'consola',
    'pathe',
  ],
  declaration: true,
  rollup: {
    emitCJS: false,
  },
})
