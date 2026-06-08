<script setup lang="ts">
import { ref } from 'vue'

import { useI18n } from '@inkly/vue'

import AssetsPanel from './AssetsPanel.vue'
import LayerTree from './LayerTree.vue'

const { menu, panels } = useI18n()
const activePanel = ref<'file' | 'assets'>('file')
</script>

<template>
  <aside
    data-test-id="layers-panel"
    class="flex min-w-0 flex-1 flex-col overflow-hidden border-r border-border bg-panel"
    style="contain: paint layout style"
  >
    <div class="flex shrink-0 gap-1 border-b border-border px-2 py-1.5">
      <button
        data-test-id="left-panel-layers-tab"
        class="flex-1 rounded px-2 py-1 text-xs transition-colors"
        :class="activePanel === 'file' ? 'bg-hover text-surface' : 'text-muted hover:text-surface'"
        @click="activePanel = 'file'"
      >
        {{ menu.file }}
      </button>
      <button
        data-test-id="left-panel-assets-tab"
        class="flex-1 rounded px-2 py-1 text-xs transition-colors"
        :class="
          activePanel === 'assets' ? 'bg-hover text-surface' : 'text-muted hover:text-surface'
        "
        @click="activePanel = 'assets'"
      >
        {{ panels.assets }}
      </button>
    </div>
    <AssetsPanel v-if="activePanel === 'assets'" />
    <div v-else class="flex flex-1 flex-col overflow-hidden">
      <header
        data-test-id="layers-header"
        class="shrink-0 px-3 py-2 text-[11px] tracking-wider text-muted uppercase"
      >
        {{ panels.layers }}
      </header>
      <LayerTree data-test-id="layers-tree" />
    </div>
  </aside>
</template>
