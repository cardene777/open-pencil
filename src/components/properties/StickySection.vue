<script setup lang="ts">
import { computed } from 'vue'

import { colorToCSS } from '@inkly/core/color'
import type { Color } from '@inkly/core/types'
import {
  getStickyColorKey,
  getStickyColorPreset,
  isStickyNote,
  setStickyNoteColor,
  STICKY_COLOR_KEYS,
  type StickyColorKey
} from '@inkly/core/scene-graph'
import { useSelectionState } from '@inkly/vue'
import { useEditorStore } from '@/app/editor/active-store'

const store = useEditorStore()
const { selectedNode: node } = useSelectionState()

const isSticky = computed(() => isStickyNote(node.value))
const activeColor = computed<StickyColorKey>(() =>
  node.value ? getStickyColorKey(node.value) : 'yellow'
)

const swatches = STICKY_COLOR_KEYS.map((key) => ({
  key,
  preset: getStickyColorPreset(key)
}))

function rgbCss(color: Color) {
  return colorToCSS(color)
}

function applyColor(colorKey: StickyColorKey) {
  if (!node.value) return
  const nodeId = node.value.id
  store.undo.runBatch('Change sticky color', () => {
    setStickyNoteColor(store.graph, nodeId, colorKey)
  })
  store.requestRender()
}
</script>

<template>
  <section
    v-if="isSticky"
    data-test-id="sticky-section"
    class="flex flex-col gap-2 border-b border-border px-3 py-3"
  >
    <header class="flex items-center justify-between">
      <span class="text-[11px] uppercase tracking-[0.16em] text-muted">Sticky</span>
    </header>
    <div class="flex items-center gap-2">
      <button
        v-for="swatch in swatches"
        :key="swatch.key"
        type="button"
        :data-test-id="`sticky-color-${swatch.key}`"
        :aria-label="`Sticky color ${swatch.key}`"
        class="size-6 rounded-full border border-white/10 ring-offset-2 ring-offset-panel transition hover:scale-110"
        :class="activeColor === swatch.key ? 'ring-2 ring-accent' : ''"
        :style="{ backgroundColor: rgbCss(swatch.preset.background) }"
        @click="applyColor(swatch.key)"
      />
    </div>
  </section>
</template>
