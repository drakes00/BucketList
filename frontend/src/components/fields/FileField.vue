<script setup lang="ts">
import { computed } from 'vue'
import { pb } from '../../lib/pocketbase'
import type { CollectionField } from '../../lib/schema'

const props = defineProps<{
  field: CollectionField
  collectionName: string
  recordId?: string
  existingValue?: string | string[]
}>()

const model = defineModel<File | null>({ default: null })

const existingFilenames = computed<string[]>(() => {
  if (!props.existingValue) return []
  return Array.isArray(props.existingValue) ? props.existingValue : [props.existingValue]
})

function thumbUrl(filename: string): string {
  if (!props.recordId) return ''
  return pb.files.getURL({ id: props.recordId, collectionName: props.collectionName }, filename, {
    thumb: '200x200',
  })
}

function onChange(e: Event) {
  const input = e.target as HTMLInputElement
  model.value = input.files?.[0] ?? null
}
</script>

<template>
  <div class="flex flex-col gap-2">
    <div v-if="existingFilenames.length" class="flex flex-wrap gap-2">
      <a
        v-for="name in existingFilenames"
        :key="name"
        :href="thumbUrl(name)"
        target="_blank"
        rel="noopener"
      >
        <img :src="thumbUrl(name)" :alt="name" class="h-20 w-20 rounded object-cover border border-gray-300 dark:border-gray-600" />
      </a>
    </div>
    <input type="file" :accept="field.mimeTypes ? (field.mimeTypes as string[]).join(',') : undefined" @change="onChange" />
  </div>
</template>
