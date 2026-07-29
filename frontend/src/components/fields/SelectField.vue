<script setup lang="ts">
import { computed } from 'vue'
import type { CollectionField } from '../../lib/schema'

const props = defineProps<{ field: CollectionField }>()
const model = defineModel<string | string[]>({ default: '' })

const isMulti = computed(() => (props.field.maxSelect ?? 1) > 1)

const multiModel = computed<string[]>({
  get: () => (Array.isArray(model.value) ? model.value : []),
  set: (v) => {
    model.value = v
  },
})

function toggle(value: string, checked: boolean) {
  const set = new Set(multiModel.value)
  if (checked) set.add(value)
  else set.delete(value)
  multiModel.value = Array.from(set)
}
</script>

<template>
  <select
    v-if="!isMulti"
    v-model="model"
    :required="field.required"
    class="w-full rounded border border-gray-300 dark:border-gray-600 bg-transparent px-2 py-1"
  >
    <option value="" disabled>Select…</option>
    <option v-for="opt in field.values ?? []" :key="opt" :value="opt">{{ opt }}</option>
  </select>
  <div v-else class="flex flex-wrap gap-3">
    <label v-for="opt in field.values ?? []" :key="opt" class="flex items-center gap-1">
      <input
        type="checkbox"
        :checked="multiModel.includes(opt)"
        @change="toggle(opt, ($event.target as HTMLInputElement).checked)"
      />
      {{ opt }}
    </label>
  </div>
</template>
