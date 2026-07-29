<script setup lang="ts">
import { computed } from 'vue'
import type { RecordModel } from 'pocketbase'
import { DATE_COMPLETED_FIELD, recordDisplayName, type AchievementCollection } from '../lib/schema'
import StatusBadge from './StatusBadge.vue'

const props = defineProps<{
  collection: AchievementCollection
  records: RecordModel[]
}>()

const emit = defineEmits<{ edit: [RecordModel]; delete: [RecordModel] }>()

const hasDateCompleted = computed(() =>
  props.collection.fields.some((f) => f.name === DATE_COMPLETED_FIELD),
)
const columnCount = computed(() => 3 + (props.collection.hasCreated ? 1 : 0) + (hasDateCompleted.value ? 1 : 0))

function fmtDate(value: unknown): string {
  if (!value || typeof value !== 'string') return ''
  return value.slice(0, 10)
}
</script>

<template>
  <table class="w-full text-left text-sm">
    <thead>
      <tr class="border-b border-gray-300 dark:border-gray-600 text-gray-500">
        <th class="py-2 pr-3">Name</th>
        <th class="py-2 pr-3">Status</th>
        <th v-if="collection.hasCreated" class="py-2 pr-3">Created</th>
        <th v-if="hasDateCompleted" class="py-2 pr-3">Completed</th>
        <th class="py-2 pr-3" />
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="record in records"
        :key="record.id"
        class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900 cursor-pointer"
        @click="emit('edit', record)"
      >
        <td class="py-2 pr-3">{{ recordDisplayName(collection, record) }}</td>
        <td class="py-2 pr-3"><StatusBadge :status="record[collection.statusField.name]" /></td>
        <td v-if="collection.hasCreated" class="py-2 pr-3 text-gray-500">{{ fmtDate(record.created) }}</td>
        <td v-if="hasDateCompleted" class="py-2 pr-3 text-gray-500">{{ fmtDate(record[DATE_COMPLETED_FIELD]) }}</td>
        <td class="py-2 pr-3 text-right">
          <button
            class="text-red-600 hover:underline"
            @click.stop="emit('delete', record)"
          >
            Delete
          </button>
        </td>
      </tr>
      <tr v-if="!records.length">
        <td :colspan="columnCount" class="py-6 text-center text-gray-500">No items yet.</td>
      </tr>
    </tbody>
  </table>
</template>
