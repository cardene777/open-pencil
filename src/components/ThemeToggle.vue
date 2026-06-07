<script setup lang="ts">
import { computed } from 'vue'

import { useI18n, type TestIdProps } from '@inkly/vue'

import { useAppTheme, type AppTheme } from '@/app/shell/theme'

interface ThemeToggleProps extends TestIdProps {
  variant?: 'icon' | 'pill'
}

const { testId = 'theme-toggle', variant = 'icon' } = defineProps<ThemeToggleProps>()
const { landing } = useI18n()
const { theme, isLight, setTheme } = useAppTheme()

const order: AppTheme[] = ['light', 'dark', 'auto']
const labelFor = computed(() => ({
  light: landing.value.themeLight,
  dark: landing.value.themeDark,
  auto: landing.value.themeAuto
}))
const ariaLabel = computed(() => landing.value.themeAria)

function cycle() {
  const idx = order.indexOf(theme.value as AppTheme)
  const next = order[(idx + 1) % order.length] ?? 'dark'
  setTheme(next)
}
</script>

<template>
  <button
    v-if="variant === 'icon'"
    type="button"
    :data-test-id="testId"
    :aria-label="ariaLabel"
    :title="labelFor[theme as AppTheme]"
    class="inline-flex size-9 cursor-pointer items-center justify-center rounded-full border border-border bg-canvas-elevated text-surface transition-colors hover:bg-hover hover:border-border-strong focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
    @click="cycle"
  >
    <icon-lucide-sun
      v-if="isLight"
      class="size-4"
      aria-hidden="true"
    />
    <icon-lucide-moon
      v-else-if="theme === 'dark'"
      class="size-4"
      aria-hidden="true"
    />
    <icon-lucide-monitor
      v-else
      class="size-4"
      aria-hidden="true"
    />
  </button>
  <button
    v-else
    type="button"
    :data-test-id="testId"
    :aria-label="ariaLabel"
    class="inline-flex items-center gap-2 rounded-full border border-border bg-canvas-elevated px-3 py-1.5 text-xs font-medium text-surface transition-colors hover:bg-hover hover:border-border-strong focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
    @click="cycle"
  >
    <icon-lucide-sun
      v-if="isLight"
      class="size-3.5"
      aria-hidden="true"
    />
    <icon-lucide-moon
      v-else-if="theme === 'dark'"
      class="size-3.5"
      aria-hidden="true"
    />
    <icon-lucide-monitor
      v-else
      class="size-3.5"
      aria-hidden="true"
    />
    <span>{{ labelFor[theme as AppTheme] }}</span>
  </button>
</template>
