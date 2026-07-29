<script setup lang="ts">
import type { CollectionField } from '../../lib/schema'

defineProps<{ field: CollectionField }>()
const model = defineModel<number | null>({ default: null })
</script>

<template>
  <input
    v-model.number="model"
    type="number"
    step="any"
    :required="field.required"
    class="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-2 py-1"
  />
</template>
