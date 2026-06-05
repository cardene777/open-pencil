<script setup lang="ts">
const { loading = false, migrating = false } = defineProps<{
  loading?: boolean
  migrating?: boolean
}>()

const emit = defineEmits<{
  login: []
}>()
</script>

<template>
  <section
    data-test-id="login-banner"
    class="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(81,131,255,0.08))] p-5 md:flex-row md:items-center md:justify-between"
  >
    <div class="space-y-2">
      <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-accent">
        Optional account
      </p>
      <h2 class="text-xl font-semibold text-surface">Log in with Google to keep your boards</h2>
      <p class="max-w-2xl text-sm text-muted">
        Anonymous mode stays available. If you log in, Inkly migrates your current anonymous boards
        to your account automatically.
      </p>
      <p v-if="migrating" class="text-xs text-accent">Migrating your anonymous boards…</p>
    </div>

    <button
      type="button"
      data-test-id="login-banner-button"
      class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-canvas transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="loading"
      @click="emit('login')"
    >
      <icon-lucide-log-in class="size-4" />
      {{ loading ? 'Starting…' : 'Google でログイン' }}
    </button>
  </section>
</template>
