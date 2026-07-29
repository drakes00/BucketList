<script setup lang="ts">
import { RouterLink, RouterView, useRouter } from 'vue-router'
import { useAuthStore } from './stores/auth'

const auth = useAuthStore()
const router = useRouter()

function logout() {
  auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="mx-auto flex min-h-screen max-w-5xl flex-col px-4">
    <header v-if="auth.isAuthenticated" class="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 py-4">
      <nav class="flex gap-4 text-sm font-medium">
        <RouterLink to="/" class="hover:underline">Dashboard</RouterLink>
        <RouterLink to="/map" class="hover:underline">Map</RouterLink>
      </nav>
      <div class="flex items-center gap-3 text-sm text-gray-500">
        <span>{{ auth.email }}</span>
        <button class="hover:underline" @click="logout">Sign out</button>
      </div>
    </header>
    <main class="flex-1 py-6">
      <RouterView />
    </main>
  </div>
</template>
