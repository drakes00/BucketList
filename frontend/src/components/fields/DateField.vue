<script setup lang="ts">
import { computed } from 'vue'
import type { CollectionField } from '../../lib/schema'

const props = defineProps<{ field: CollectionField }>()
const model = defineModel<string>({ default: '' })

const readonly = computed(() => props.field.type === 'autodate')

const dateOnly = computed<string>({
  get: () => (model.value ? model.value.slice(0, 10) : ''),
  set: (v) => {
    model.value = v
  },
})
</script>

<template>
  <input
    v-if="readonly"
    :value="dateOnly"
    type="date"
    disabled
    class="w-full rounded border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-2 py-1 text-gray-500"
  />
  <input
    v-else
    v-model="dateOnly"
    type="date"
    :required="field.required"
    class="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-2 py-1"
  />
</template>
