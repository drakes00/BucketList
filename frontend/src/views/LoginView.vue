<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const auth = useAuthStore()
const router = useRouter()

const email = ref('')
const password = ref('')

async function submit() {
  try {
    await auth.login(email.value, password.value)
    router.push('/')
  } catch {
    // error surfaced via auth.error
  }
}
</script>

<template>
  <div class="mx-auto mt-24 flex w-full max-w-sm flex-col gap-4">
    <h1 class="text-xl font-semibold">Sign in</h1>
    <p class="text-sm text-gray-500">
      Use your PocketBase superuser account (the one you created at
      <code>/_/</code>).
    </p>
    <form class="flex flex-col gap-3" @submit.prevent="submit">
      <input
        v-model="email"
        type="email"
        placeholder="Email"
        autocomplete="username"
        required
        class="rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
      />
      <input
        v-model="password"
        type="password"
        placeholder="Password"
        autocomplete="current-password"
        required
        class="rounded border border-gray-300 dark:border-gray-600 bg-transparent px-3 py-2"
      />
      <p v-if="auth.error" class="text-sm text-red-600">{{ auth.error }}</p>
      <button
        type="submit"
        :disabled="auth.loading"
        class="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
      >
        {{ auth.loading ? 'Signing in…' : 'Sign in' }}
      </button>
    </form>
  </div>
</template>
