<script setup lang="ts">
import { nextTick, ref } from 'vue'
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuPortal,
  ContextMenuRoot,
  ContextMenuSeparator,
  ContextMenuTrigger,
  TabsList,
  TabsRoot,
  TabsTrigger
} from 'reka-ui'

import { type Page } from '@/app/api/client'
import Tip from '@/components/ui/Tip.vue'
import { useI18n } from '@inkly/vue'

const props = defineProps<{
  pages: Page[]
  activePageId: string | null
}>()

const emit = defineEmits<{
  createPage: []
  switchPage: [pageId: string]
  renamePage: [payload: { pageId: string; name: string }]
  deletePage: [pageId: string]
  duplicatePage: [pageId: string]
}>()

const { pages: pageMessages } = useI18n()

// 自前の inline rename state — TabsTrigger / ContextMenu の focus 奪取と
// useInlineRename の onClickOutside が競合するため、 vueuse に頼らず最小実装にする。
const editingPageId = ref<string | null>(null)
const editingValue = ref('')
let originalName = ''

async function startRename(page: Page) {
  editingPageId.value = page.id
  editingValue.value = page.name
  originalName = page.name
  await nextTick()
}

function setRenameInput(el: unknown) {
  if (!(el instanceof HTMLInputElement)) return
  if (editingPageId.value === null) return
  requestAnimationFrame(() => {
    el.focus()
    el.select()
  })
}

function commitRename(pageId: string) {
  if (editingPageId.value !== pageId) return
  const value = editingValue.value.trim()
  if (value && value !== originalName) {
    emit('renamePage', { pageId, name: value })
  }
  editingPageId.value = null
  editingValue.value = ''
}

function cancelRename() {
  editingPageId.value = null
  editingValue.value = ''
}

function onRenameKeydown(e: KeyboardEvent, pageId: string) {
  if (e.code === 'Enter') {
    e.preventDefault()
    commitRename(pageId)
  } else if (e.code === 'Escape') {
    e.preventDefault()
    cancelRename()
  }
}

function onSwitchPage(pageId: string) {
  emit('switchPage', pageId)
}

function onClose(e: MouseEvent, pageId: string) {
  e.stopPropagation()
  emit('deletePage', pageId)
}
</script>

<template>
  <TabsRoot
    :model-value="activePageId ?? undefined"
    activation-mode="automatic"
    class="scrollbar-none flex h-9 shrink-0 items-end overflow-x-auto border-b border-border bg-canvas"
    @update:model-value="onSwitchPage(String($event))"
  >
    <TabsList class="flex h-full items-end">
      <ContextMenuRoot v-for="page in pages" :key="page.id" :modal="false">
        <ContextMenuTrigger as-child>
          <TabsTrigger
            :value="page.id"
            data-test-id="tabbar-page-tab"
            class="group/page flex h-full max-w-52 min-w-0 cursor-pointer items-center gap-1.5 border-r border-border px-3 text-xs transition-colors outline-none select-none focus-visible:ring-1 focus-visible:ring-accent data-[state=active]:bg-panel data-[state=active]:text-surface data-[state=inactive]:text-muted data-[state=inactive]:hover:text-surface"
          >
            <icon-lucide-file-spreadsheet class="size-3 shrink-0 opacity-60" />
            <input
              v-if="editingPageId === page.id"
              :ref="setRenameInput"
              v-model="editingValue"
              data-test-id="tabbar-page-input"
              class="min-w-0 flex-1 rounded border border-accent bg-input px-1 py-0 text-xs text-surface outline-none"
              @blur="commitRename(page.id)"
              @mousedown.stop
              @click.stop
              @dblclick.stop
              @pointerdown.stop
              @keydown.stop="onRenameKeydown($event, page.id)"
            />
            <span
              v-else
              class="min-w-0 flex-1 truncate"
              @dblclick.stop="void startRename(page)"
            >
              {{ page.name }}
            </span>
            <Tip :label="pageMessages.delete">
              <button
                data-test-id="tabbar-page-delete"
                class="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded opacity-0 transition-opacity group-hover/page:opacity-100 hover:bg-hover data-[state=active]:opacity-100"
                :class="page.id === activePageId ? 'opacity-100' : ''"
                :aria-label="pageMessages.delete"
                tabindex="-1"
                @click="onClose($event, page.id)"
              >
                <icon-lucide-x class="size-3" />
              </button>
            </Tip>
          </TabsTrigger>
        </ContextMenuTrigger>
        <ContextMenuPortal>
          <ContextMenuContent
            class="z-50 min-w-36 rounded-md border border-border bg-panel p-1 shadow-lg"
          >
            <ContextMenuItem
              class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs text-surface outline-none hover:bg-hover"
              @select="void startRename(page)"
            >
              {{ pageMessages.rename }}
            </ContextMenuItem>
            <ContextMenuItem
              class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs text-surface outline-none hover:bg-hover"
              @select="emit('duplicatePage', page.id)"
            >
              Duplicate
            </ContextMenuItem>
            <ContextMenuSeparator class="mx-1 my-1 h-px bg-border" />
            <ContextMenuItem
              class="flex cursor-pointer items-center rounded px-2 py-1.5 text-xs text-red-200 outline-none hover:bg-hover"
              @select="emit('deletePage', page.id)"
            >
              {{ pageMessages.delete }}
            </ContextMenuItem>
          </ContextMenuContent>
        </ContextMenuPortal>
      </ContextMenuRoot>
    </TabsList>
    <Tip :label="pageMessages.newPage">
      <button
        data-test-id="tabbar-page-new"
        class="flex size-9 shrink-0 cursor-pointer items-center justify-center text-muted transition-colors hover:text-surface"
        :aria-label="pageMessages.newPage"
        @click="emit('createPage')"
      >
        <icon-lucide-plus class="size-3.5" />
      </button>
    </Tip>
  </TabsRoot>
</template>
