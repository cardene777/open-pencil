<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, onUnmounted, provide, ref, watch } from 'vue'
import { useEventListener, useUrlSearchParams } from '@vueuse/core'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useHead } from '@unhead/vue'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'

import { useViewportKind, formatShortcut, useI18n } from '@inkly/vue'
import { useKeyboard } from '@/app/shell/keyboard/use'
import { loadEditorLayout, saveEditorLayout } from '@/app/shell/layout-storage'
import { openFileFromPath, useMenu } from '@/app/shell/menu/use'
import { createBoardPreviewLocation, listBoards } from '@/app/api/client'
import { clearActiveBoard, setActiveBoard, activeBoard } from '@/app/boards/active'
import { writeBoardPreview } from '@/app/boards/preview'
import { useCollab, COLLAB_KEY } from '@/app/collab/use'
import { connectAutomation } from '@/app/automation/bridge/server'
import { spawnMCPIfNeeded } from '@/app/automation/mcp/spawn'
import { isTauri } from '@/app/tauri/env'
import { appMenuShortcut } from '@/app/shell/menu/shortcut'
import { createDemoShapes } from '@/app/demo/document'
import { useEditorStore } from '@/app/editor/active-store'
import { createTab, activeTab, getActiveStore, tabCount } from '@/app/tabs'

import CollabPanel from '@/components/CollabPanel/CollabPanel.vue'
import EditorCanvas from '@/components/EditorCanvas.vue'
import LayersPanel from '@/components/LayersPanel.vue'
import MobileDrawer from '@/components/MobileDrawer.vue'
import AutosaveStatus from '@/components/AutosaveStatus.vue'
import MobileHud from '@/components/MobileHud/MobileHud.vue'
import PropertiesPanel from '@/components/PropertiesPanel.vue'
import SafariBanner from '@/components/SafariBanner.vue'
import SaveAndLeaveModal from '@/components/SaveAndLeaveModal.vue'
import TabBar from '@/components/TabBar.vue'
import { persistPrototypePreviewDocument } from '@/app/prototype/document'
import { resolvePrototypeStartFrameId } from '@/app/prototype/frames'
import Tip from '@/components/ui/Tip.vue'
import Toolbar from '@/components/Toolbar/Toolbar.vue'

const route = useRoute()
const router = useRouter()
const params = useUrlSearchParams('history')
const showChrome = !('no-chrome' in params)

const createdInitialTab = tabCount() === 0
const firstTab = createdInitialTab ? createTab() : (activeTab.value ?? createTab())
const store = useEditorStore()
const { dialogs, prototype: prototypeT } = useI18n()
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
  // /board/:id route の :id を優先、 無ければ ?board= クエリ (旧形式 backward compat)
  const paramId = route.params.id
  if (typeof paramId === 'string' && paramId.length > 0) return paramId
  return typeof route.query.board === 'string' && route.query.board.length > 0
    ? route.query.board
    : null
})
const boardName = computed(() =>
  typeof route.query.name === 'string' && route.query.name.length > 0 ? route.query.name : null
)
let previewWriteTimer: ReturnType<typeof setTimeout> | null = null
let documentUploadTimer: ReturnType<typeof setTimeout> | null = null

/**
 * board document を server DB (SSOT) に sceneVersion 変更ごと debounce 1.5 秒で upload。
 * 招待された collaborator が同じ design を読み込むため、 IndexedDB cache とは別 layer で
 * 確実に server へ書く。 source.ts 内の autosave 経路は idle 時にしか走らないため、
 * sceneVersion watcher 直結 + 明示 PUT が必要。
 */
async function flushBoardDocument(boardId: string) {
  try {
    const [{ exportFigFile }, { uploadBoardDocument }] = await Promise.all([
      import('@inkly/core/io/formats/fig'),
      import('@/app/api/client')
    ])
    const bytes = await exportFigFile(getActiveStore().graph)
    await uploadBoardDocument(boardId, bytes)
  } catch (error) {
    console.warn('[editor] failed to upload board document to server:', error)
  }
}

function scheduleBoardDocumentUpload(boardId: string) {
  if (documentUploadTimer) clearTimeout(documentUploadTimer)
  documentUploadTimer = setTimeout(() => {
    void flushBoardDocument(boardId)
  }, 1500)
}

function flushBoardPreview(boardId: string) {
  const sceneCanvas = document.querySelector<HTMLCanvasElement>(
    '[data-test-id="scene-canvas-element"]'
  )
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

async function loadBoardMetadata(boardId: string) {
  try {
    const boards = await listBoards()
    setActiveBoard(boards.find((board) => board.id === boardId) ?? null)
  } catch (error) {
    console.warn('[board]', 'failed to load board metadata', error)
    clearActiveBoard(boardId)
  }
}

let lastLoadedBoardId: string | null = null
let suppressUploadVersion = -1

/**
 * boardRoomId watcher から呼ぶ — server DB (SSOT) から最新 document を取得し、 graph を差し替える。
 * これで招待された collaborator や別端末の owner も同じ design を見られる。
 * route 解決済の boardId で呼ぶので main.ts の早期 restore より race condition なく動く。
 *
 * collab 経路と組み合わさるとき ... server 側は旧 `.pen` (= `.fig` binary) を yjs update
 * format として読み取れないので Y.Doc が空のまま client に届く (PR #210 で上書き保存を抑止)。
 * その状態で client が `.pen` を decode → `replaceGraph` した場合、 SceneGraph は local には
 * 入るが Y.Doc には反映されないので他 collaborator に共有されない。 そこで「hub 接続中 +
 * Y.Doc が空 + decode 済 SceneGraph が non-empty」のときに `syncCurrentDoc()` を呼んで全 node
 * を yjs に書き込み、 server snapshot 経路で永続化される状態に持ち上げる。
 */
async function loadBoardDocument(boardId: string) {
  if (lastLoadedBoardId === boardId) return
  lastLoadedBoardId = boardId
  try {
    const [{ fetchBoardDocument }, { readFigFile }] = await Promise.all([
      import('@/app/api/client'),
      import('@inkly/core/io/formats/fig')
    ])
    const remote = await fetchBoardDocument(boardId)
    if (!remote || remote.bytes.length === 0) {
      console.info('[editor] no server document for board', boardId)
      return
    }

    const blob = new Blob([remote.bytes], { type: 'application/octet-stream' })
    const file = new File([blob], `${boardId}.fig`, { type: 'application/octet-stream' })
    const graph = await readFigFile(file, { populate: 'first-page' })

    const activeStore = getActiveStore()
    activeStore.replaceGraph(graph)

    // boards API から取った board.name を documentName に反映、 breadcrumb の identifier 表示を消す。
    // activeBoard は loadBoardMetadata で同 watcher 経路から先に解決される。
    if (activeBoard.value?.name) {
      activeStore.state.documentName = activeBoard.value.name
    }

    // canvas renderer が遅延 mount している場合に備え、 明示的に再描画 + 全体 fit を要求する
    // (replaceGraph 内部の requestRender だけだと canvas mount 前の場合 silently drop される)
    activeStore.requestRender()
    requestAnimationFrame(() => {
      try {
        activeStore.zoomToFit?.()
      } catch {
        // zoomToFit が無い editor 実装に備える silent fallback
      }
    })

    // 直後の sceneVersion +1 を「サーバから取り込んだ反映」扱いにし、 PUT で送り返さない
    suppressUploadVersion = activeStore.state.sceneVersion

    // hub 接続中 + Y.Doc が空 + import 済 SceneGraph 非空 のときに seed 経路を起動。
    void seedYjsFromImportedGraphIfNeeded(boardId)
  } catch (error) {
    console.warn('[editor] failed to load board document:', error)
  }
}

/**
 * `.pen` import 直後に Y.Doc が空 (旧 binary は yjs format でない) なら、 import した
 * SceneGraph を yjs に seed して collab 経路 + server snapshot に持ち上げる。
 * hub の syncStep round-trip 完了余地として小さい遅延を挟む (race を許容するが、
 * 「初回 import + Y.Doc 空」という低リスク経路に限定)。
 */
async function seedYjsFromImportedGraphIfNeeded(boardId: string) {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 800)
  })

  if (boardRoomId.value !== boardId) return
  if (!collab.state.value.connected) return
  if (!collab.hubConnected.value) return

  const ynodes = collab.getYnodes()
  // hub から実 node が流れていれば ynodes.size > 0、 その場合は seed しない。
  if (!ynodes || ynodes.size > 0) return

  const activeStore = getActiveStore()
  // default page + root の 2 node 程度なら「中身なし」とみなして seed しない。
  let nodeCount = 0
  for (const _ of activeStore.graph.getAllNodes()) {
    nodeCount += 1
    if (nodeCount > 2) break
  }
  if (nodeCount <= 2) return

  console.info('[editor] seeding empty Y.Doc with imported .pen content', {
    boardId,
    nodes: nodeCount
  })
  collab.syncCurrentDoc()
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
  (roomId, previousRoomId) => {
    if (previousRoomId) {
      flushBoardPreview(previousRoomId)
      if (collab.state.value.roomId === previousRoomId) collab.disconnect()
      clearActiveBoard(previousRoomId)
    }
    if (!roomId) return
    if (collab.state.value.connected && collab.state.value.roomId === roomId) return
    // board id をそのまま hub 経路にも渡す。 server yjs-hub の room と client の Y.Doc を
    // 同一 board に紐付ける (figma / miro と同じ server-mediated 経路を default 化、
    // 接続失敗時のみ P2P fallback)。
    collab.connect(roomId, { seedIfEmpty: true, boardId: roomId })
    // metadata (board.name) を先に解決してから document を取り込み、 取り込み後に
    // documentName を board.name で書き換える経路を保証する
    void (async () => {
      await loadBoardMetadata(roomId)
      await loadBoardDocument(roomId)
    })()
  },
  { immediate: true }
)

watch(
  () => (boardRoomId.value ? getActiveStore().state.sceneVersion : -1),
  (sceneVersion) => {
    if (!boardRoomId.value || sceneVersion < 0) return
    scheduleBoardPreview(boardRoomId.value)
    // server から取り込んだ直後の sceneVersion bump は upload しない (loopback 防止)
    if (sceneVersion === suppressUploadVersion) return
    // yjs hub に接続中は server hub の compaction routine が board_documents snapshot を
    // 書き込むため、 PUT 全文経路は重複 IO になる。 hub provider 未起動 (一時 share room や
    // 接続失敗 fallback 状態) のときだけ PUT 経路を使う。
    if (collab.hubConnected.value) return
    scheduleBoardDocumentUpload(boardRoomId.value)
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
  if (documentUploadTimer) clearTimeout(documentUploadTimer)
  if (boardRoomId.value) {
    flushBoardPreview(boardRoomId.value)
    void flushBoardDocument(boardRoomId.value)
  }
})

onUnmounted(() => {
  mcpCleanup.value?.()
  automationCleanup.value?.()
  fileAssociationCleanup.value?.()
})

const saveModalOpen = ref(false)

function handleBackToDashboard(event: MouseEvent) {
  // 既にダッシュボードに保存済 (boardRoomId 有り) の場合は通常遷移
  if (boardRoomId.value) return
  // 何も編集していない場合も通常遷移
  const scene = getActiveStore().state.sceneVersion ?? 0
  if (scene <= 0) return
  // 未保存の編集ありなのでモーダル起動
  event.preventDefault()
  saveModalOpen.value = true
}

const playStartFrameId = computed(() => {
  void store.state.sceneVersion
  return activeBoard.value?.startFrameId ?? resolvePrototypeStartFrameId(store.graph)
})

async function openPreview() {
  if (!boardRoomId.value || !playStartFrameId.value) return
  await persistPrototypePreviewDocument(boardRoomId.value, store)
  await router.push(createBoardPreviewLocation(boardRoomId.value, playStartFrameId.value))
}
</script>

<template>
  <div data-test-id="editor-root" class="flex h-screen w-screen flex-col">
    <SafariBanner />
    <TabBar />
    <div
      v-if="showChrome"
      class="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-canvas/95 px-4 py-2"
    >
      <div class="flex min-w-0 items-center gap-2">
        <RouterLink
          to="/dashboard"
          data-test-id="editor-back-to-dashboard"
          class="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted hover:bg-surface hover:text-surface"
          title="ダッシュボードへ戻る"
          @click="handleBackToDashboard"
        >
          <span aria-hidden="true">←</span>
          <span>ダッシュボード</span>
        </RouterLink>
        <span class="text-muted">/</span>
        <span data-test-id="editor-document-name" class="truncate text-sm font-medium text-surface">
          {{ store.state.documentName }}
        </span>
      </div>
      <div class="flex items-center gap-2">
        <button
          v-if="boardRoomId && playStartFrameId"
          data-test-id="editor-play-button"
          class="cursor-pointer rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
          @click="openPreview"
        >
          {{ prototypeT.play }}
        </button>
        <span v-if="boardRoomId" class="text-[11px] text-muted">Board {{ boardRoomId }}</span>
      </div>
    </div>
    <SaveAndLeaveModal v-model:open="saveModalOpen" :document-name="store.state.documentName" />

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
