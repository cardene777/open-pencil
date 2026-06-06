<script setup lang="ts">
import { useI18n } from '@inkly/vue'

import { initials } from '@/app/shell/ui'

type MentionOption = {
  id: string
  name: string
  email: string
  image: string | null
}

const props = defineProps<{
  activeIndex: number
  candidates: MentionOption[]
  loading?: boolean
  query: string
}>()

const emit = defineEmits<{
  hover: [index: number]
  select: [id: string]
}>()

const { mentionInput: mentionInputT } = useI18n()
</script>

<template>
  <div
    data-test-id="mention-input"
    class="w-80 rounded-2xl border border-white/10 bg-panel/96 p-2 shadow-2xl backdrop-blur-xl"
  >
    <div class="px-2 py-1">
      <p class="text-[10px] font-medium uppercase tracking-[0.18em] text-accent">{{ mentionInputT.heading }}</p>
      <p class="mt-1 text-xs text-muted">
        <span v-if="props.query.length > 0">{{ mentionInputT.matchingQuery({ query: props.query }) }}</span>
        <span v-else>{{ mentionInputT.prompt }}</span>
      </p>
    </div>

    <div
      v-if="props.loading"
      data-test-id="mention-loading"
      class="px-2 py-3 text-xs text-muted"
    >
      {{ mentionInputT.loading }}
    </div>

    <div
      v-else-if="props.candidates.length === 0"
      data-test-id="mention-empty"
      class="px-2 py-3 text-xs text-muted"
    >
      {{ mentionInputT.empty }}
    </div>

    <ul v-else class="mt-1 space-y-1">
      <li v-for="(candidate, index) in props.candidates" :key="candidate.id">
        <button
          type="button"
          data-test-id="mention-option"
          class="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-hover"
          :class="index === props.activeIndex ? 'bg-hover text-surface' : 'text-muted'"
          @mouseenter="emit('hover', index)"
          @click="emit('select', candidate.id)"
        >
          <img
            v-if="candidate.image"
            :src="candidate.image"
            :alt="mentionInputT.avatarAlt({ name: candidate.name || candidate.email })"
            class="size-8 rounded-full object-cover"
          />
          <span
            v-else
            class="flex size-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(103,149,255,0.85),rgba(78,95,172,0.85))] text-[10px] font-semibold text-white"
          >
            {{ initials(candidate.name || candidate.email) }}
          </span>

          <span class="min-w-0 flex-1">
            <span class="block truncate text-sm font-medium text-surface">{{ candidate.name }}</span>
            <span class="block truncate text-[11px] text-muted">{{ candidate.email }}</span>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>
