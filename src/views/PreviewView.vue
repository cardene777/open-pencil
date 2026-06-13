<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useHead } from '@unhead/vue'
import { useRoute, useRouter } from 'vue-router'

import { hitTestDeep, type PrototypeReaction, type SceneGraph } from '@inkly/core/scene-graph'
import { useCanvas, useI18n } from '@inkly/vue'

import { activeBoard } from '@/app/boards/active'
import { fileFromCachedPen, loadCachedPen } from '@/app/document/io/pen-cache'
import { createEditorStore } from '@/app/editor/session'
import { findPageId, resolvePrototypeStartFrameId } from '@/app/prototype/frames'
import { executeReaction, type PrototypeRuntimeState } from '@/app/prototype/runtime'

const route = useRoute()
const router = useRouter()
const { prototype: prototypeT } = useI18n()

const boardId = computed(() => (typeof route.params.id === 'string' ? route.params.id : ''))
const preferredStartFrameId = computed(() =>
  typeof route.query.startFrame === 'string' ? route.query.startFrame : null
)
const previewStore = createEditorStore()
const canvasRef = ref<HTMLCanvasElement | null>(null)
const ready = ref(false)
const loading = ref(true)
const unavailable = ref(false)
const runtimeState = ref<PrototypeRuntimeState | null>(null)
const startFrameId = ref<string | null>(null)
const transitionClass = ref('prototype-transition-instant')
const baseVisibility = new Map<string, boolean>()

useHead({
  title: computed(() => (boardId.value ? `Preview ${boardId.value}` : 'Preview'))
})

useCanvas(canvasRef, previewStore, {
  showRulers: false,
  onReady: () => {
    ready.value = true
  }
})

function collectDescendants(graph: SceneGraph, nodeId: string, visible: Set<string>) {
  visible.add(nodeId)
  for (const child of graph.getChildren(nodeId)) {
    collectDescendants(graph, child.id, visible)
  }
}

function collectAncestors(graph: SceneGraph, nodeId: string, visible: Set<string>) {
  let current = graph.getNode(nodeId)
  while (current) {
    visible.add(current.id)
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
}

function applyPreviewVisibility(state: PrototypeRuntimeState) {
  const visible = new Set<string>()
  collectDescendants(previewStore.graph, state.currentFrameId, visible)
  collectAncestors(previewStore.graph, state.currentFrameId, visible)
  if (state.overlayFrameId) {
    collectDescendants(previewStore.graph, state.overlayFrameId, visible)
    collectAncestors(previewStore.graph, state.overlayFrameId, visible)
  }

  for (const node of previewStore.graph.getAllNodes()) {
    const nextVisible = visible.has(node.id) ? (baseVisibility.get(node.id) ?? node.visible) : false
    if (node.visible !== nextVisible) {
      previewStore.graph.updateNode(node.id, { visible: nextVisible })
    }
  }
}

async function syncPreviewState(state: PrototypeRuntimeState) {
  const pageId = findPageId(previewStore.graph, state.currentFrameId)
  if (pageId && previewStore.state.currentPageId !== pageId) {
    await previewStore.switchPage(pageId)
  }

  applyPreviewVisibility(state)
  previewStore.clearSelection()
  previewStore.requestRender()

  await nextTick()
  requestAnimationFrame(() => {
    const frame = previewStore.graph.getNode(state.currentFrameId)
    if (!frame) return
    const abs = previewStore.graph.getAbsolutePosition(frame.id)
    previewStore.zoomToBounds(abs.x, abs.y, abs.x + frame.width, abs.y + frame.height)
  })
}

function findReaction(nodeId: string, trigger: PrototypeReaction['trigger']) {
  let current = previewStore.graph.getNode(nodeId)
  while (current) {
    const reaction = current.reactions?.find((entry) => entry.trigger === trigger)
    if (reaction) return reaction
    if (current.type === 'CANVAS') return null
    current = current.parentId ? previewStore.graph.getNode(current.parentId) : undefined
  }
  return null
}

function transitionName(reaction: PrototypeReaction) {
  return `prototype-transition-${reaction.transition ?? 'instant'}`
}

function runReaction(reaction: PrototypeReaction) {
  if (reaction.action === 'externalUrl' && reaction.externalUrl) {
    window.open(reaction.externalUrl, '_blank', 'noopener,noreferrer')
    return
  }

  transitionClass.value = transitionName(reaction)
  runtimeState.value = executeReaction(
    runtimeState.value as PrototypeRuntimeState,
    reaction,
    previewStore.graph
  )
}

function handleCanvasClick(event: MouseEvent) {
  const state = runtimeState.value
  const canvas = canvasRef.value
  if (!state || !canvas) return

  const rect = canvas.getBoundingClientRect()
  const { x, y } = previewStore.screenToCanvas(event.clientX - rect.left, event.clientY - rect.top)
  const hitOverlay = state.overlayFrameId
    ? hitTestDeep(previewStore.graph, x, y, state.overlayFrameId)
    : null
  const hitNode = hitOverlay ?? hitTestDeep(previewStore.graph, x, y, state.currentFrameId)
  if (!hitNode) return

  const reaction = findReaction(hitNode.id, 'onClick')
  if (!reaction) return
  runReaction(reaction)
}

async function loadPreviewDocument() {
  if (!boardId.value) {
    unavailable.value = true
    loading.value = false
    return
  }

  loading.value = true
  unavailable.value = false

  try {
    const cached = await loadCachedPen(boardId.value)
    if (!cached) {
      unavailable.value = true
      return
    }

    const { readFigFile } = await import('@inkly/core/io/formats/fig')
    const graph = await readFigFile(fileFromCachedPen(cached), { populate: 'first-page' })
    previewStore.replaceGraph(graph)

    baseVisibility.clear()
    for (const node of previewStore.graph.getAllNodes()) {
      baseVisibility.set(node.id, node.visible)
    }

    const resolvedStartFrame =
      resolvePrototypeStartFrameId(
        previewStore.graph,
        preferredStartFrameId.value ?? activeBoard.value?.startFrameId
      ) ?? null

    startFrameId.value = resolvedStartFrame
    if (!resolvedStartFrame) {
      unavailable.value = true
      return
    }

    runtimeState.value = {
      currentFrameId: resolvedStartFrame,
      overlayFrameId: null,
      history: []
    }
    await syncPreviewState(runtimeState.value)
  } finally {
    loading.value = false
  }
}

function handleBack() {
  const state = runtimeState.value
  if (!state) return
  runtimeState.value = executeReaction(
    state,
    { trigger: 'onClick', action: 'back' },
    previewStore.graph
  )
}

function handleReset() {
  if (!startFrameId.value) return
  runtimeState.value = {
    currentFrameId: startFrameId.value,
    overlayFrameId: null,
    history: []
  }
}

function handleClose() {
  if (!boardId.value) return
  void router.push(`/board/${boardId.value}`)
}

watch(
  runtimeState,
  (state) => {
    if (!state || !ready.value) return
    void syncPreviewState(state)
  },
  { deep: true }
)

watch(ready, (isReady) => {
  if (isReady && runtimeState.value) void syncPreviewState(runtimeState.value)
})

onMounted(() => {
  void loadPreviewDocument()
})

onUnmounted(() => {
  previewStore.dispose()
})
</script>

<template>
  <main
    data-test-id="preview-view"
    class="flex min-h-screen flex-col bg-[radial-gradient(circle_at_top_left,rgba(255,196,92,0.14),transparent_24%),linear-gradient(180deg,var(--color-canvas),#0e131b)]"
  >
    <header
      class="flex items-center justify-between gap-3 border-b border-border bg-panel/80 px-4 py-3 backdrop-blur"
    >
      <div class="flex items-center gap-2">
        <button
          data-test-id="preview-back"
          class="cursor-pointer rounded border border-border bg-canvas px-3 py-1.5 text-xs text-surface hover:bg-hover disabled:opacity-40"
          :disabled="!(runtimeState?.history.length || runtimeState?.overlayFrameId)"
          @click="handleBack"
        >
          {{ prototypeT.back }}
        </button>
        <button
          data-test-id="preview-reset"
          class="cursor-pointer rounded border border-border bg-canvas px-3 py-1.5 text-xs text-surface hover:bg-hover"
          @click="handleReset"
        >
          {{ prototypeT.resetToStart }}
        </button>
      </div>
      <button
        data-test-id="preview-close"
        class="cursor-pointer rounded bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90"
        @click="handleClose"
      >
        {{ prototypeT.close }}
      </button>
    </header>

    <div class="flex flex-1 items-center justify-center p-4">
      <div
        v-if="loading"
        class="rounded-2xl border border-border bg-panel/80 px-5 py-4 text-sm text-muted"
      >
        {{ prototypeT.loadingPreview }}
      </div>
      <div
        v-else-if="unavailable"
        class="rounded-2xl border border-border bg-panel/80 px-5 py-4 text-sm text-muted"
      >
        {{ prototypeT.previewUnavailable }}
      </div>
      <div
        v-else
        data-test-id="preview-stage"
        class="relative h-[calc(100vh-8rem)] w-full overflow-hidden rounded-3xl border border-white/10 bg-canvas shadow-2xl"
        :class="transitionClass"
      >
        <canvas
          ref="canvasRef"
          data-test-id="preview-canvas"
          class="h-full w-full"
          @click="handleCanvasClick"
        />
      </div>
    </div>
  </main>
</template>
