<script setup lang="ts">
import { useI18n } from '@inkly/vue'

const { loading = false, migrating = false } = defineProps<{
  loading?: boolean
  migrating?: boolean
}>()

const emit = defineEmits<{
  login: []
}>()

const { loginBanner: loginBannerT } = useI18n()
</script>

<template>
  <section
    data-test-id="login-banner"
    class="flex flex-col gap-4 rounded-[24px] border border-border bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(81,131,255,0.08))] p-5 md:flex-row md:items-center md:justify-between"
  >
    <div class="space-y-2">
      <p class="text-[11px] font-medium uppercase tracking-[0.24em] text-accent">
        {{ loginBannerT.eyebrow }}
      </p>
      <h2 class="text-xl font-semibold text-surface">{{ loginBannerT.heading }}</h2>
      <p class="max-w-2xl text-sm text-muted">
        {{ loginBannerT.description }}
      </p>
      <p v-if="migrating" class="text-xs text-accent">{{ loginBannerT.migrating }}</p>
    </div>

    <button
      type="button"
      data-test-id="login-banner-button"
      class="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-medium text-canvas transition-colors hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
      :disabled="loading"
      @click="emit('login')"
    >
      <icon-lucide-log-in class="size-4" :aria-hidden="true" />
      {{ loading ? loginBannerT.loginPending : loginBannerT.loginButton }}
    </button>
  </section>
</template>
