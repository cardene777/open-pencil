<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { templateRef } from '@vueuse/core'
import { useRoute, useRouter } from 'vue-router'

import { PageListRoot, useI18n, useInlineRename } from '@inkly/vue'

import { createBoardPreviewLocation, updateBoardStartFrame } from '@/app/api/client'
import { activeBoard, patchActiveBoard } from '@/app/boards/active'
import { useEditorStore } from '@/app/editor/active-store'
import { persistPrototypePreviewDocument } from '@/app/prototype/document'
import { listFramesByPage, resolvePrototypeStartFrameId } from '@/app/prototype/frames'
import { toast } from '@/app/shell/ui'
import Tip from '@/components/ui/Tip.vue'

const editor = useEditorStore()
const route = useRoute()
const router = useRouter()
const pageInput = templateRef<HTMLInputElement>('pageInput')
const rename = useInlineRename((id, name) => pageActions.value?.rename(id, name))
const { panels, prototype: prototypeT } = useI18n()

const pageActions = ref<{
  rename: (pageId: string, name: string) => void
} | null>(null)
const sceneVersion = computed(() => editor.state.sceneVersion)
const boardId = computed(() => (typeof route.params.id === 'string' ? route.params.id : null))
const startFrameId = computed(() => activeBoard.value?.startFrameId ?? null)

function setPageActions(renamePage: (pageId: string, name: string) => void) {
  pageActions.value = { rename: renamePage }
}

watch(pageInput, (input) => {
  if (input) void rename.focusInput(input)
})

function startRename(pg: { id: string; name: string }) {
  rename.start(pg.id, pg.name)
}

function handlePageDblClick(
  pg: { id: string; name: string },
  renamePage: (pageId: string, name: string) => void
) {
  setPageActions(renamePage)
  startRename(pg)
}

function framesForPage(pageId: string) {
  void sceneVersion.value
  return listFramesByPage(editor.graph, pageId)
}

async function selectFrame(pageId: string, frameId: string) {
  if (editor.state.currentPageId !== pageId) {
    await editor.switchPage(pageId)
  }
  editor.select([frameId])
}

async function handleSetStartFrame(frameId: string) {
  if (!boardId.value) return
  try {
    const board = await updateBoardStartFrame(boardId.value, frameId)
    patchActiveBoard({ startFrameId: board.startFrameId })
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Failed to update start frame')
  }
}

async function openPreview(
  startFrame = startFrameId.value ?? resolvePrototypeStartFrameId(editor.graph)
) {
  if (!boardId.value || !startFrame) return
  await persistPrototypePreviewDocument(boardId.value, editor)
  await router.push(createBoardPreviewLocation(boardId.value, startFrame))
}
</script>

<template>
  <PageListRoot v-slot="{ pages, currentPageId, isDivider, actions }">
    <div data-test-id="pages-panel" class="flex min-h-0 flex-1 flex-col">
      <div class="flex shrink-0 items-center justify-between px-3 py-1.5">
        <span data-test-id="pages-header" class="text-[11px] tracking-wider text-muted uppercase">{{
          panels.pages
        }}</span>
        <div class="flex items-center gap-1">
          <Tip v-if="boardId" :label="prototypeT.openInPreview">
            <button
              data-test-id="pages-open-preview"
              class="cursor-pointer rounded border-none bg-transparent px-1 text-sm leading-none text-muted hover:bg-hover hover:text-surface"
              @click="openPreview()"
            >
              ▶
            </button>
          </Tip>
          <Tip :label="panels.addPage">
            <button
              data-test-id="pages-add"
              class="cursor-pointer rounded border-none bg-transparent px-1 text-base leading-none text-muted hover:bg-hover hover:text-surface"
              @click="actions.add()"
            >
              +
            </button>
          </Tip>
        </div>
      </div>
      <div class="min-h-0 flex-1 overflow-hidden">
        <div
          data-test-id="pages-scroll"
          class="scrollbar-thin h-full overflow-x-hidden overflow-y-auto px-1 pb-1"
        >
          <div v-for="pg in pages" :key="pg.id">
            <div
              v-if="rename.editingId.value === pg.id"
              class="flex w-full items-center gap-1.5 rounded px-2 py-1"
            >
              <icon-lucide-file class="size-3 shrink-0 opacity-70" />
              <input
                ref="pageInput"
                data-test-id="pages-item-input"
                class="min-w-0 flex-1 rounded border border-accent bg-input px-1 py-0 text-xs text-surface outline-none"
                :value="pg.name"
                @blur="rename.commit(pg.id, $event)"
                @keydown.stop="rename.onKeydown"
              />
            </div>
            <div
              v-else-if="isDivider(pg)"
              class="my-1 flex items-center px-2"
              @dblclick="startRename(pg)"
            >
              <div class="h-px flex-1 bg-border" />
            </div>
            <button
              v-else
              data-test-id="pages-item"
              class="flex w-full cursor-pointer items-center gap-1.5 rounded border-none px-2 py-1 text-left text-xs"
              :class="
                pg.id === currentPageId
                  ? 'bg-hover text-surface'
                  : 'bg-transparent text-muted hover:bg-hover hover:text-surface'
              "
              @click="actions.switch(pg.id)"
              @dblclick="handlePageDblClick(pg, actions.rename)"
            >
              <icon-lucide-file class="size-3 shrink-0" />
              <span class="truncate">{{ pg.name }}</span>
            </button>
            <div v-if="!isDivider(pg)" class="mt-0.5 ml-5 space-y-0.5">
              <div
                v-for="frame in framesForPage(pg.id)"
                :key="frame.id"
                class="flex items-center gap-1 rounded px-2 py-1 text-[11px]"
                :style="{ paddingLeft: `${frame.depth * 12 + 8}px` }"
              >
                <button
                  :data-test-id="`pages-frame-${frame.id}`"
                  class="min-w-0 flex-1 cursor-pointer truncate rounded bg-transparent text-left text-muted hover:text-surface"
                  @click="selectFrame(pg.id, frame.id)"
                >
                  {{ frame.name }}
                </button>
                <button
                  v-if="boardId"
                  :data-test-id="`pages-set-start-frame-${frame.id}`"
                  class="cursor-pointer rounded px-1 text-xs"
                  :class="
                    startFrameId === frame.id
                      ? 'text-amber-400'
                      : 'text-muted hover:bg-hover hover:text-surface'
                  "
                  :aria-label="prototypeT.setAsStartFrame"
                  @click="handleSetStartFrame(frame.id)"
                >
                  ★
                </button>
                <button
                  v-if="boardId"
                  :data-test-id="`pages-open-preview-${frame.id}`"
                  class="cursor-pointer rounded px-1 text-xs text-muted hover:bg-hover hover:text-surface"
                  :aria-label="prototypeT.openInPreview"
                  @click="openPreview(frame.id)"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </PageListRoot>
</template>
