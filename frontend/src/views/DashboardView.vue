<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { pb } from '../lib/pocketbase'
import { STATUS_VALUES } from '../lib/schema'
import { useSchemaStore } from '../stores/schema'

const schema = useSchemaStore()
const loading = ref(true)
const error = ref('')
const counts = reactive<Record<string, Record<string, number>>>({})

onMounted(async () => {
  try {
    await schema.load()
    for (const collection of schema.collections) {
      const records = await pb.collection(collection.name).getFullList({ fields: collection.statusField.name })
      const tally: Record<string, number> = { todo: 0, ongoing: 0, completed: 0 }
      for (const record of records) {
        const status = record[collection.statusField.name]
        if (status in tally) tally[status]++
      }
      counts[collection.name] = tally
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load dashboard'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="flex flex-col gap-6">
    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
    <p v-else-if="loading" class="text-gray-500">Loading…</p>
    <p v-else-if="!schema.collections.length" class="text-gray-500">
      No achievement collections yet. Create one in the
      <a class="underline" href="/_/" target="_blank" rel="noopener">PocketBase admin</a>
      — see the README for the required field conventions.
    </p>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <RouterLink
        v-for="collection in schema.collections"
        :key="collection.id"
        :to="`/c/${collection.name}`"
        class="rounded border border-gray-300 dark:border-gray-600 p-4 hover:shadow"
      >
        <h2 class="mb-3 text-lg font-semibold capitalize">{{ collection.name.replace(/_/g, ' ') }}</h2>
        <ul class="flex flex-col gap-1 text-sm">
          <li v-for="status in STATUS_VALUES" :key="status" class="flex justify-between capitalize">
            <span>{{ status }}</span>
            <span class="font-medium">{{ counts[collection.name]?.[status] ?? 0 }}</span>
          </li>
        </ul>
      </RouterLink>
    </div>
  </div>
</template>
