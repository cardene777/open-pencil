<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'

import { useI18n } from '@inkly/vue'
import { useAuthStore } from '@/app/auth/store'

const { permissionDenied: t } = useI18n()

useHead({ title: () => t.value.headTitle })

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const blockedPath = computed(() => (route.query.from as string | undefined) ?? route.path)

function goToInvited() {
  router.replace('/dashboard')
}

async function handleSignOut() {
  await auth.signOut()
  router.replace('/')
}
</script>

<template>
  <main
    data-test-id="permission-denied-view"
    class="relative flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_center,rgba(212,160,90,0.10),transparent_45%),var(--color-canvas)] px-6"
  >
    <div
      class="w-full max-w-xl rounded-3xl border border-border bg-panel/90 p-10 text-center shadow-2xl backdrop-blur-xl"
    >
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-canvas/80">
        <svg
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="h-7 w-7 text-surface"
        >
          <rect x="4" y="11" width="16" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
          <circle cx="12" cy="15.5" r="1" />
        </svg>
      </div>

      <h1 class="mt-6 text-[22px] font-semibold tracking-tight text-surface">{{ t.headline }}</h1>
      <p class="mt-3 text-sm leading-relaxed text-muted">{{ t.description }}</p>

      <p
        v-if="blockedPath"
        data-test-id="permission-denied-blocked-path"
        class="mt-3 text-[11px] uppercase tracking-[0.18em] text-muted/70"
      >
        {{ t.blockedPathLabel }} {{ blockedPath }}
      </p>

      <div class="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button
          type="button"
          data-test-id="permission-denied-primary"
          class="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
          @click="goToInvited"
        >
          {{ t.ctaPrimary }}
        </button>
        <button
          type="button"
          data-test-id="permission-denied-signout"
          class="inline-flex h-11 items-center justify-center rounded-lg border border-border bg-panel px-5 text-sm font-semibold text-surface transition-colors hover:bg-canvas/60"
          @click="handleSignOut"
        >
          {{ t.ctaSignOut }}
        </button>
      </div>
    </div>
  </main>
</template>
