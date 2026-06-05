<script setup lang="ts">
import { computed } from 'vue'
import { useHead } from '@unhead/vue'

import { useAuthStore } from '@/app/auth/store'
import { toast, initials } from '@/app/shell/ui'

useHead({ title: 'Account' })

const auth = useAuthStore()
void auth.init()

const displayName = computed(() => auth.user?.name?.trim() || auth.user?.email || 'Inkly User')
const avatarInitials = computed(() => initials(displayName.value))

async function startLogin() {
  try {
    await auth.signInWithGoogle()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to start Google login'
    toast.error(message)
  }
}

async function signOut() {
  try {
    await auth.signOut()
    toast.info('Signed out')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to sign out'
    toast.error(message)
  }
}
</script>

<template>
  <main
    data-test-id="account-view"
    class="min-h-screen bg-[radial-gradient(circle_at_top,rgba(89,140,255,0.18),transparent_35%),linear-gradient(180deg,var(--color-canvas),#0d1017)] px-6 py-10"
  >
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <section
        class="rounded-[28px] border border-white/8 bg-panel/80 p-6 shadow-2xl backdrop-blur-xl"
      >
        <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-accent">Account</p>
        <h1 class="mt-2 text-3xl font-semibold text-surface">Profile</h1>
        <p class="mt-2 max-w-2xl text-sm text-muted">
          Inkly works without an account. Sign in only if you want to migrate your anonymous boards
          and keep them under your user profile.
        </p>
      </section>

      <section
        v-if="!auth.initialized || auth.loading"
        class="rounded-[24px] border border-border bg-panel/70 p-6 text-sm text-muted"
      >
        Loading account…
      </section>

      <section
        v-else-if="!auth.isAuthenticated"
        class="rounded-[24px] border border-white/8 bg-panel/80 p-6 shadow-xl"
      >
        <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div class="space-y-2">
            <h2 class="text-xl font-semibold text-surface">Continue with Google</h2>
            <p class="max-w-xl text-sm text-muted">
              If Google OAuth is not configured in this environment, the button will report that it
              is unavailable and anonymous mode will keep working.
            </p>
          </div>

          <button
            type="button"
            data-test-id="account-login-button"
            class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-canvas transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="auth.loginPending"
            @click="startLogin"
          >
            <icon-lucide-log-in class="size-4" />
            {{ auth.loginPending ? 'Starting…' : 'Google でログイン' }}
          </button>
        </div>
      </section>

      <section
        v-else
        data-test-id="account-profile"
        class="rounded-[24px] border border-white/8 bg-panel/80 p-6 shadow-xl"
      >
        <div class="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-4">
            <img
              v-if="auth.user?.image"
              :src="auth.user.image"
              :alt="`${displayName} avatar`"
              data-test-id="account-avatar-image"
              class="size-16 rounded-full border border-white/10 object-cover"
            />
            <div
              v-else
              data-test-id="account-avatar-fallback"
              class="flex size-16 items-center justify-center rounded-full border border-white/10 bg-[linear-gradient(135deg,rgba(103,149,255,0.85),rgba(78,95,172,0.85))] text-lg font-semibold text-white"
            >
              {{ avatarInitials }}
            </div>

            <div class="space-y-1">
              <p data-test-id="account-name" class="text-lg font-semibold text-surface">
                {{ displayName }}
              </p>
              <p data-test-id="account-email" class="text-sm text-muted">
                {{ auth.user?.email }}
              </p>
              <p v-if="auth.migrating" class="text-xs text-accent">Migrating your boards…</p>
            </div>
          </div>

          <button
            type="button"
            data-test-id="account-logout-button"
            class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-surface transition-colors hover:bg-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="auth.logoutPending"
            @click="signOut"
          >
            <icon-lucide-log-out class="size-4" />
            {{ auth.logoutPending ? 'Signing out…' : 'Log out' }}
          </button>
        </div>
      </section>
    </div>
  </main>
</template>
