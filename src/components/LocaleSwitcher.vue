<script setup lang="ts">
import { useI18n } from '@inkly/vue'

const { locale, availableLocales, localeLabels, setLocale } = useI18n()

const { testId = 'locale-switcher' } = defineProps<{
  testId?: string
}>()

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement | null
  if (!target) return
  const next = target.value as (typeof availableLocales)[number]
  if (next === locale.value) return
  setLocale(next)
}
</script>

<template>
  <label class="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-canvas/55 px-2 py-1.5 text-sm text-surface transition-colors hover:bg-hover">
    <icon-lucide-languages
      :aria-hidden="true"
      class="size-4 text-muted"
    />
    <span class="sr-only">{{ localeLabels[locale] }}</span>
    <select
      :data-test-id="testId"
      :value="locale"
      class="cursor-pointer bg-transparent text-sm text-surface outline-none"
      @change="handleChange"
    >
      <option
        v-for="code in availableLocales"
        :key="code"
        :value="code"
      >
        {{ localeLabels[code] }}
      </option>
    </select>
  </label>
</template>
