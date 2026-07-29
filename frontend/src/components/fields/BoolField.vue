<script setup lang="ts">
defineProps<{ field: { name: string } }>()
const model = defineModel<boolean>({ default: false })
</script>

<template>
  <input v-model="model" type="checkbox" class="h-4 w-4" />
</template>
