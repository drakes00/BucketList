<script setup lang="ts">
import type { CollectionField } from '../../lib/schema'

defineProps<{ field: CollectionField }>()
const model = defineModel<string>({ default: '' })
</script>

<template>
  <textarea
    v-if="field.type === 'editor'"
    v-model="model"
    :required="field.required"
    rows="4"
    class="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-2 py-1"
  />
  <input
    v-else
    v-model="model"
    type="text"
    :required="field.required"
    class="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-2 py-1"
  />
</template>
