<template>
  <div style="padding: 2rem; font-family: sans-serif;">
    <h1>Nuxt Queue Demo</h1>

    <div style="margin: 2rem 0;">
      <h2>Add Job to Queue</h2>
      <input
        v-model="jobName"
        placeholder="Job name"
        style="padding: 0.5rem; margin-right: 0.5rem;"
      >
      <input
        v-model="jobData"
        placeholder="Job data (JSON)"
        style="padding: 0.5rem; margin-right: 0.5rem; width: 300px;"
      >
      <button
        style="padding: 0.5rem 1rem; cursor: pointer;"
        @click="addJob"
      >
        Add Job
      </button>
    </div>

    <div
      v-if="result"
      style="margin: 2rem 0; padding: 1rem; background: #f0f0f0; border-radius: 4px;"
    >
      <h3>Result:</h3>
      <pre>{{ result }}</pre>
    </div>

    <div
      v-if="error"
      style="margin: 2rem 0; padding: 1rem; background: #fee; border-radius: 4px; color: #c00;"
    >
      <h3>Error:</h3>
      <pre>{{ error }}</pre>
    </div>
  </div>
</template>

<script setup lang="ts">
const { $queue } = useNuxtApp()

const jobName = ref('test-job')
const jobData = ref('{"message": "Hello from queue!"}')
const result = ref()
const error = ref()

async function addJob() {
  try {
    error.value = null
    result.value = null

    const data = JSON.parse(jobData.value)
    const response = await $queue.add(jobName.value, data)

    result.value = response
  }
  catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
  }
}
</script>
