<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { useEventListener, useUrlSearchParams } from '@vueuse/core'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'

import { readFigFile } from '@inkly/core/io/formats/fig'
import { SceneGraph } from '@inkly/core/scene-graph'
import { formatShortcut, useI18n, useViewportKind } from '@inkly/vue'
import {
  createBoardPage,
  decodeBoardContentBytes,
  deleteBoardPage,
  fetchPageContent,
  listBoardPages,
  savePageContent,
  updateBoard,
  updateBoardPage
} from '@/app/api/client'
import { connectAutomation } from '@/app/automation/bridge/server'
import { spawnMCPIfNeeded } from '@/app/automation/mcp/spawn'
import { validateBoardNameInput } from '@/app/boards/name'
import { writeBoardPreview } from '@/app/boards/preview'
import { useCollab, COLLAB_KEY } from '@/app/collab/use'
import { createDemoShapes } from '@/app/demo/document'
import { applyImportedDocument } from '@/app/document/io/imported-document'
import { useEditorStore } from '@/app/editor/active-store'
import {
  activeBoardPageId,
  addBoardPage,
  boardPages,
  clearBoardPages,
  removeBoardPage,
  setActiveBoardPageId,
  setBoardPages,
  updateBoardPageEntry
} from '@/app/pages'
import { loadEditorLayout, saveEditorLayout } from '@/app/shell/layout-storage'
import { useKeyboard } from '@/app/shell/keyboard/use'
import { openFileFromPath, useMenu } from '@/app/shell/menu/use'
import { appMenuShortcut } from '@/app/shell/menu/shortcut'
import { toast } from '@/app/shell/ui'
import { isTauri } from '@/app/tauri/env'
import { activeTab, createTab, getActiveStore, resetAllTabs, tabCount } from '@/app/tabs'

import AutosaveStatus from '@/components/AutosaveStatus.vue'
import CollabPanel from '@/components/CollabPanel/CollabPanel.vue'
import EditorCanvas from '@/components/EditorCanvas.vue'
import LayersPanel from '@/components/LayersPanel.vue'
import MobileDrawer from '@/components/MobileDrawer.vue'
import MobileHud from '@/components/MobileHud/MobileHud.vue'
import PropertiesPanel from '@/components/PropertiesPanel.vue'
import SafariBanner from '@/components/SafariBanner.vue'
import TabBar from '@/components/TabBar.vue'
import Tip from '@/components/ui/Tip.vue'
import Toolbar from '@/components/Toolbar/Toolbar.vue'

const route = useRoute()
const router = useRouter()
const params = useUrlSearchParams('history')
const showChrome = !('no-chrome' in params)

const isBoardRoute = typeof route.params.id === 'string' && route.params.id.length > 0
const createdInitialTab = tabCount() === 0
const firstTab = isBoardRoute
  ? resetAllTabs()
  : createdInitialTab
    ? createTab()
    : (activeTab.value ?? createTab())
const store = useEditorStore()
const { dialogs } = useI18n()
const { isMobile } = useViewportKind()

if (createdInitialTab && route.meta.demo && !('test' in params)) {
  createDemoShapes(firstTab.store)
}

useHead({ title: route.meta.demo ? 'Demo' : undefined })
useKeyboard()
useMenu()

const collab = useCollab(getActiveStore)
provide(COLLAB_KEY, collab)

const boardRoomId = computed(() => {
  const paramId = route.params.id
  if (typeof paramId === 'string' && paramId.length > 0) return paramId
  return typeof route.query.board === 'string' && route.query.board.length > 0
    ? route.query.board
    : null
})
const boardName = computed(() =>
  typeof route.query.name === 'string' && route.query.name.length > 0 ? route.query.name : null
)
const boardTeamName = computed(() =>
  typeof route.query.teamName === 'string' && route.query.teamName.length > 0
    ? route.query.teamName
    : null
)
const isEditingBoardName = ref(false)
const editingBoardName = ref('')
const editingBoardNameInput = ref<HTMLInputElement | null>(null)
const savingBoardName = ref(false)
let previewWriteTimer: ReturnType<typeof setTimeout> | null = null
let boardLoadToken = 0
let pageLoadToken = 0

function flushBoardPreview(boardId: string) {
  const sceneCanvas = document.querySelector<HTMLCanvasElement>('[data-test-id="scene-canvas-element"]')
  if (!sceneCanvas || sceneCanvas.width === 0 || sceneCanvas.height === 0) return
  writeBoardPreview(boardId, sceneCanvas.toDataURL('image/png'))
}

function scheduleBoardPreview(boardId: string) {
  if (previewWriteTimer) clearTimeout(previewWriteTimer)
  previewWriteTimer = setTimeout(() => {
    requestAnimationFrame(() => {
      flushBoardPreview(boardId)
    })
  }, 50)
}

function nextPageName() {
  return `Page ${boardPages.value.length + 1}`
}

function duplicatePageName(name: string) {
  const trimmed = name.trim()
  return trimmed.length > 0 ? `${trimmed} Copy` : 'Page Copy'
}

async function loadBoardPage(
  boardId: string,
  pageId: string,
  options: { fitViewport?: boolean; flushCurrent?: boolean } = {}
) {
  const targetPage = boardPages.value.find((page) => page.id === pageId)
  if (!targetPage) return

  const shouldFlushCurrent = options.flushCurrent ?? true
  const token = ++pageLoadToken

  try {
    store.state.loading = true
    if (shouldFlushCurrent) {
      await store.flushRemotePageAutosaveNow()
    }

    const remoteContent = await fetchPageContent(boardId, pageId)
    if (token !== pageLoadToken) return
    if (!remoteContent) {
      throw new Error('Page content not found')
    }

    const bytes = remoteContent.content ? decodeBoardContentBytes(remoteContent.content) : null
    const graph = bytes
      ? await readFigFile(new File([bytes], `${targetPage.name}.fig`), { populate: 'first-page' })
      : new SceneGraph()

    if (token !== pageLoadToken) return

    setActiveBoardPageId(pageId)
    await applyImportedDocument(store, graph)
    store.setDocumentSource(`${boardName.value ?? 'Untitled board'}.fig`, 'fig')
    await store.syncRemotePageAutosaveBaseline(pageId, bytes)
    if (options.fitViewport) {
      await store.fitCurrentPageToViewport()
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load page'
    toast.error(message)
  } finally {
    if (token === pageLoadToken) {
      store.state.loading = false
    }
  }
}

async function startEditBoardName() {
  if (!boardRoomId.value || savingBoardName.value) return
  isEditingBoardName.value = true
  editingBoardName.value = store.state.documentName
  await nextTick()
  editingBoardNameInput.value?.focus()
  editingBoardNameInput.value?.select()
}

function cancelEditBoardName() {
  if (savingBoardName.value) return
  isEditingBoardName.value = false
  editingBoardName.value = ''
}

async function saveBoardName() {
  if (!boardRoomId.value || savingBoardName.value) return

  const validation = validateBoardNameInput(editingBoardName.value)
  if (!validation.ok) {
    toast.error(validation.message)
    return
  }

  if (validation.value === store.state.documentName) {
    cancelEditBoardName()
    return
  }

  savingBoardName.value = true
  try {
    const updatedBoard = await updateBoard(boardRoomId.value, { name: validation.value })
    store.state.documentName = updatedBoard.name
    isEditingBoardName.value = false
    editingBoardName.value = ''
    await router.replace({
      path: route.path,
      query: {
        ...route.query,
        name: updatedBoard.name
      }
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to rename board'
    toast.error(message)
  } finally {
    savingBoardName.value = false
  }
}

async function handleCreatePage() {
  if (!boardRoomId.value) return

  try {
    const page = await createBoardPage(boardRoomId.value, {
      name: nextPageName(),
      position: boardPages.value.length
    })
    addBoardPage(page)
    await loadBoardPage(boardRoomId.value, page.id, { fitViewport: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create page'
    toast.error(message)
  }
}

async function handleSwitchPage(pageId: string) {
  if (!boardRoomId.value || activeBoardPageId.value === pageId) return
  await loadBoardPage(boardRoomId.value, pageId, { fitViewport: true })
}

async function handleRenamePage(pageId: string, name: string) {
  const boardId = boardRoomId.value
  if (!boardId) return

  const validation = validateBoardNameInput(name)
  if (!validation.ok) {
    toast.error(validation.message)
    return
  }

  try {
    const page = await updateBoardPage(boardId, pageId, { name: validation.value })
    updateBoardPageEntry(page)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to rename page'
    toast.error(message)
  }
}

async function handleDeletePage(pageId: string) {
  const boardId = boardRoomId.value
  if (!boardId) return

  const currentPages = boardPages.value
  const currentIndex = currentPages.findIndex((page) => page.id === pageId)
  if (currentIndex === -1) return

  const remainingPages = currentPages.filter((page) => page.id !== pageId)
  const fallbackPage =
    remainingPages[Math.max(0, currentIndex - 1)] ?? remainingPages[0] ?? null
  const wasActive = activeBoardPageId.value === pageId

  try {
    await deleteBoardPage(boardId, pageId)
    removeBoardPage(pageId)

    if (wasActive) {
      setActiveBoardPageId(null)
      store.resetRemotePageAutosaveState()
      if (fallbackPage) {
        await loadBoardPage(boardId, fallbackPage.id, {
          fitViewport: true,
          flushCurrent: false
        })
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete page'
    toast.error(message)
  }
}

async function handleDuplicatePage(pageId: string) {
  const boardId = boardRoomId.value
  if (!boardId) return

  const sourcePage = boardPages.value.find((page) => page.id === pageId)
  if (!sourcePage) return

  try {
    if (activeBoardPageId.value === pageId) {
      await store.flushRemotePageAutosaveNow()
    }

    const sourceContent = await fetchPageContent(boardId, pageId)
    const duplicatedPage = await createBoardPage(boardId, {
      name: duplicatePageName(sourcePage.name),
      position: boardPages.value.length
    })

    if (sourceContent?.content) {
      await savePageContent(boardId, duplicatedPage.id, sourceContent.content)
    }

    addBoardPage(duplicatedPage)
    await loadBoardPage(boardId, duplicatedPage.id, { fitViewport: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to duplicate page'
    toast.error(message)
  }
}

useEventListener(
  document,
  'wheel',
  (e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) e.preventDefault()
  },
  { passive: false }
)

const automationCleanup = ref<(() => void) | null>(null)
const mcpCleanup = ref<(() => void) | null>(null)
const fileAssociationCleanup = ref<(() => void) | null>(null)
const initialEditorLayout = loadEditorLayout()

type PendingOpenFile = {
  path: string
}

async function openPendingAssociatedFiles() {
  const { invoke } = await import('@tauri-apps/api/core')
  const files = await invoke<PendingOpenFile[]>('take_pending_open')
  for (const file of files) {
    await openFileFromPath(file.path)
  }
}

async function bindAssociatedFileOpen() {
  if (!isTauri()) return
  const { listen } = await import('@tauri-apps/api/event')
  fileAssociationCleanup.value = await listen('open-associated-files', () => {
    void openPendingAssociatedFiles().catch((e) => console.error('[Open With]', e))
  })
  await openPendingAssociatedFiles()
}

watch(
  boardName,
  (name) => {
    if (!name) return
    getActiveStore().state.documentName = name
  },
  { immediate: true }
)

watch(
  boardRoomId,
  async (roomId, previousRoomId) => {
    const token = ++boardLoadToken
    cancelEditBoardName()

    if (previousRoomId) {
      await store.flushRemotePageAutosaveNow()
      flushBoardPreview(previousRoomId)
      if (collab.state.value.roomId === previousRoomId) collab.disconnect()
    }

    clearBoardPages()
    store.resetRemotePageAutosaveState()

    if (!roomId) return

    try {
      const pages = await listBoardPages(roomId)
      if (token !== boardLoadToken) return
      setBoardPages(roomId, pages)

      const initialPage = pages[0]
      if (initialPage) {
        await loadBoardPage(roomId, initialPage.id, {
          fitViewport: true,
          flushCurrent: false
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load pages'
      toast.error(message)
      return
    }

    if (token !== boardLoadToken) return
    if (collab.state.value.connected && collab.state.value.roomId === roomId) return
    collab.connect(roomId, { seedIfEmpty: true })
  },
  { immediate: true }
)

watch(
  () => (boardRoomId.value ? getActiveStore().state.sceneVersion : -1),
  (sceneVersion) => {
    if (!boardRoomId.value || sceneVersion < 0) return
    scheduleBoardPreview(boardRoomId.value)
  }
)

onMounted(async () => {
  try {
    const mcp = await spawnMCPIfNeeded()
    mcpCleanup.value = mcp?.disconnect ?? null
    const tauri = isTauri()
    if (import.meta.env.DEV || tauri) {
      automationCleanup.value = connectAutomation(getActiveStore, mcp?.authToken ?? null).disconnect
    }
  } catch (e) {
    console.warn('[MCP]', e)
  }

  try {
    await bindAssociatedFileOpen()
  } catch (e) {
    console.error('[Open With]', e)
  }
})

onBeforeUnmount(() => {
  if (previewWriteTimer) clearTimeout(previewWriteTimer)
  if (boardRoomId.value) flushBoardPreview(boardRoomId.value)
})

onUnmounted(() => {
  mcpCleanup.value?.()
  automationCleanup.value?.()
  fileAssociationCleanup.value?.()
})
</script>

<template>
  <div data-test-id="editor-root" class="flex h-screen w-screen flex-col">
    <SafariBanner />
    <div
      v-if="showChrome && boardRoomId"
      class="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-canvas/95 px-4 py-2"
    >
      <div class="flex min-w-0 items-center gap-2">
        <RouterLink
          to="/dashboard"
          data-test-id="editor-back-to-dashboard"
          class="flex cursor-pointer items-center gap-1 rounded px-2 py-1 text-xs text-muted"
          title="ダッシュボードへ戻る"
        >
          <span aria-hidden="true">←</span>
          <span>ダッシュボード</span>
        </RouterLink>
        <span class="text-muted">/</span>
        <input
          v-if="isEditingBoardName"
          ref="editingBoardNameInput"
          v-model="editingBoardName"
          data-test-id="editor-document-name-input"
          type="text"
          maxlength="120"
          class="min-w-0 rounded border border-accent bg-input px-2 py-1 text-sm font-medium text-surface outline-none"
          :disabled="savingBoardName"
          @blur="void saveBoardName()"
          @keydown.enter.prevent="void saveBoardName()"
          @keydown.esc.prevent="cancelEditBoardName()"
        />
        <span
          v-else
          data-test-id="editor-document-name"
          class="truncate rounded px-1 text-sm font-medium text-surface transition-colors hover:bg-hover/50"
          @click="void startEditBoardName()"
        >
          {{ store.state.documentName }}
        </span>
        <span
          v-if="boardTeamName"
          data-test-id="editor-team-badge"
          class="rounded-full border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-amber-100"
        >
          {{ boardTeamName }}
        </span>
      </div>
      <span v-if="boardRoomId" class="text-[11px] text-muted">Board {{ boardRoomId }}</span>
    </div>
    <TabBar
      v-if="boardRoomId"
      :pages="boardPages"
      :active-page-id="activeBoardPageId"
      @create-page="void handleCreatePage()"
      @switch-page="void handleSwitchPage($event)"
      @rename-page="void handleRenamePage($event.pageId, $event.name)"
      @delete-page="void handleDeletePage($event)"
      @duplicate-page="void handleDuplicatePage($event)"
    />

    <!-- Desktop layout -->
    <SplitterGroup
      v-if="!isMobile && showChrome && store.state.showUI"
      :key="activeTab?.id"
      direction="horizontal"
      class="flex-1 overflow-hidden"
      @layout="saveEditorLayout"
    >
      <SplitterPanel
        id="layers"
        :default-size="initialEditorLayout[0]"
        :min-size="10"
        :max-size="30"
        class="flex"
      >
        <LayersPanel />
      </SplitterPanel>
      <SplitterResizeHandle
        data-test-id="left-splitter-handle"
        class="group relative z-10 -mx-1 w-2 cursor-col-resize"
      >
        <div class="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
      </SplitterResizeHandle>
      <SplitterPanel id="canvas" :default-size="initialEditorLayout[1]" :min-size="30" class="flex">
        <div class="relative flex min-w-0 flex-1">
          <EditorCanvas />
          <Toolbar />
          <AutosaveStatus />
        </div>
      </SplitterPanel>
      <SplitterResizeHandle class="group relative z-10 -mx-1 w-2 cursor-col-resize">
        <div class="pointer-events-none absolute inset-y-0 left-1/2 w-px -translate-x-1/2" />
      </SplitterResizeHandle>
      <SplitterPanel
        id="properties"
        :default-size="initialEditorLayout[2]"
        :min-size="10"
        :max-size="30"
        class="flex flex-col"
      >
        <div
          class="flex shrink-0 items-center justify-between border-b border-border px-1.5 py-1.5"
        >
          <CollabPanel />
        </div>
        <PropertiesPanel />
      </SplitterPanel>
    </SplitterGroup>

    <!-- Mobile layout -->
    <div
      v-else-if="isMobile && showChrome && store.state.showUI"
      :key="'mobile-' + activeTab?.id"
      class="flex flex-1 overflow-hidden"
    >
      <div class="relative flex min-w-0 flex-1">
        <EditorCanvas />
        <MobileHud />
        <Toolbar />
      </div>
      <MobileDrawer />
    </div>

    <!-- Collapsed UI (showUI=false) -->
    <div
      v-else-if="showChrome"
      :key="'collapsed-' + activeTab?.id"
      class="flex flex-1 overflow-hidden"
    >
      <div class="relative flex min-w-0 flex-1">
        <EditorCanvas />
        <div
          v-if="!isMobile"
          class="absolute top-7 left-7 z-10 flex items-center gap-2 rounded-lg border border-border bg-panel px-2 py-1 shadow-sm"
        >
          <img src="/favicon-32.png" class="size-4" alt="Inkly" />
          <span data-test-id="editor-document-name" class="text-xs text-surface">{{
            store.state.documentName
          }}</span>
          <Tip
            :label="
              dialogs.showUI({ shortcut: formatShortcut(appMenuShortcut('toggle-ui')) ?? '' })
            "
          >
            <button
              data-test-id="editor-show-ui"
              class="ml-1 flex size-6 cursor-pointer items-center justify-center rounded text-muted transition-colors hover:bg-hover hover:text-surface"
              @click="store.state.showUI = true"
            >
              <icon-lucide-sidebar class="size-3.5" />
            </button>
          </Tip>
        </div>
      </div>
    </div>

    <!-- Bare canvas (no chrome, e.g. ?no-chrome) -->
    <div v-else :key="'bare-' + activeTab?.id" class="flex flex-1 overflow-hidden">
      <div class="relative flex min-w-0 flex-1">
        <EditorCanvas />
      </div>
    </div>
  </div>
</template>
