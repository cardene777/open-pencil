<script setup lang="ts">
import { computed } from 'vue'

import { useI18n, useSelectionState } from '@inkly/vue'
import type { PrototypeReaction } from '@inkly/core/scene-graph'

import { useSectionUI } from '@/components/ui/section'
import AppSelect from '@/components/ui/AppSelect.vue'
import { useEditorStore } from '@/app/editor/active-store'
import { findPageId, listFramesByPage } from '@/app/prototype/frames'

const editor = useEditorStore()
const { selectedNode } = useSelectionState()
const { prototype: prototypeT } = useI18n()
const sectionCls = useSectionUI()

const frameNode = computed(() => (selectedNode.value?.type === 'FRAME' ? selectedNode.value : null))
const pageId = computed(() =>
  frameNode.value ? findPageId(editor.graph, frameNode.value.id) : null
)
const frameOptions = computed(() => {
  if (!pageId.value) return []
  return listFramesByPage(editor.graph, pageId.value).map((frame) => ({
    value: frame.id,
    label: `${'  '.repeat(frame.depth)}${frame.name}`
  }))
})

const triggerOptions = computed(() => [
  { value: 'onClick' as const, label: prototypeT.value.triggerOnClick },
  { value: 'onHover' as const, label: prototypeT.value.triggerOnHover },
  { value: 'onMouseDown' as const, label: prototypeT.value.triggerOnMouseDown },
  { value: 'afterDelay' as const, label: prototypeT.value.triggerAfterDelay }
])
const actionOptions = computed(() => [
  { value: 'navigate' as const, label: prototypeT.value.actionNavigate },
  { value: 'openOverlay' as const, label: prototypeT.value.actionOpenOverlay },
  { value: 'closeOverlay' as const, label: prototypeT.value.actionCloseOverlay },
  { value: 'back' as const, label: prototypeT.value.actionBack },
  { value: 'externalUrl' as const, label: prototypeT.value.actionExternalUrl }
])
const transitionOptions = computed(() => [
  { value: 'instant' as const, label: prototypeT.value.transitionInstant },
  { value: 'dissolve' as const, label: prototypeT.value.transitionDissolve },
  { value: 'slideLeft' as const, label: prototypeT.value.transitionSlideLeft },
  { value: 'slideRight' as const, label: prototypeT.value.transitionSlideRight }
])
const targetFrameOptions = computed(() => [
  { value: '', label: prototypeT.value.noTargetFrame },
  ...frameOptions.value
])

function nextReactions(): PrototypeReaction[] {
  return structuredClone(frameNode.value?.reactions ?? [])
}

function commit(reactions: PrototypeReaction[]) {
  const node = frameNode.value
  if (!node) return
  editor.updateNode(node.id, {
    reactions: reactions.length > 0 ? reactions : undefined
  })
}

function updateReaction(index: number, changes: Partial<PrototypeReaction>) {
  const reactions = nextReactions()
  const current = reactions[index]
  if (!current) return
  reactions[index] = { ...current, ...changes }
  commit(reactions)
}

function addReaction() {
  const reactions = nextReactions()
  reactions.push({
    trigger: 'onClick',
    action: 'navigate',
    targetFrameId: frameOptions.value[0]?.value,
    transition: 'instant',
    transitionDurationMs: 300
  })
  commit(reactions)
}

function deleteReaction(index: number) {
  const reactions = nextReactions()
  reactions.splice(index, 1)
  commit(reactions)
}

function moveReaction(index: number, direction: -1 | 1) {
  const reactions = nextReactions()
  const nextIndex = index + direction
  if (nextIndex < 0 || nextIndex >= reactions.length) return
  const [reaction] = reactions.splice(index, 1)
  if (!reaction) return
  reactions.splice(nextIndex, 0, reaction)
  commit(reactions)
}

function onTriggerChange(index: number, trigger: PrototypeReaction['trigger']) {
  updateReaction(index, {
    trigger,
    delayMs:
      trigger === 'afterDelay' ? (frameNode.value?.reactions?.[index]?.delayMs ?? 300) : undefined
  })
}

function onActionChange(index: number, action: PrototypeReaction['action']) {
  const current = frameNode.value?.reactions?.[index]
  if (!current) return

  updateReaction(index, {
    action,
    targetFrameId:
      action === 'navigate' || action === 'openOverlay'
        ? (current.targetFrameId ?? frameOptions.value[0]?.value)
        : undefined,
    externalUrl: action === 'externalUrl' ? (current.externalUrl ?? '') : undefined,
    transition:
      action === 'navigate' || action === 'openOverlay'
        ? (current.transition ?? 'instant')
        : undefined
  })
}

function toNumber(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}
</script>

<template>
  <div data-test-id="prototype-panel" :class="sectionCls.wrapper">
    <div class="flex items-center justify-between">
      <label :class="sectionCls.label">{{ prototypeT.panelTitle }}</label>
      <button
        v-if="frameNode"
        data-test-id="prototype-add-reaction"
        class="cursor-pointer rounded bg-hover px-2 py-1 text-[11px] text-surface hover:bg-accent hover:text-white"
        @click="addReaction"
      >
        {{ prototypeT.addReaction }}
      </button>
    </div>

    <p v-if="!frameNode" class="text-[11px] text-muted">
      {{ prototypeT.noSelection }}
    </p>
    <p v-else-if="frameOptions.length === 0" class="text-[11px] text-muted">
      {{ prototypeT.noFrames }}
    </p>

    <div v-else class="space-y-2">
      <div
        v-for="(reaction, index) in frameNode.reactions ?? []"
        :key="`${index}:${reaction.trigger}:${reaction.action}`"
        data-test-id="prototype-reaction"
        class="rounded border border-border bg-canvas/60 p-2"
      >
        <div class="mb-2 flex items-center justify-between gap-2">
          <span class="text-[11px] font-medium text-surface">{{
            prototypeT.reaction({ index: String(index + 1) })
          }}</span>
          <div class="flex items-center gap-1">
            <button
              data-test-id="prototype-move-up"
              class="cursor-pointer rounded px-1.5 py-1 text-[10px] text-muted hover:bg-hover hover:text-surface disabled:opacity-40"
              :disabled="index === 0"
              @click="moveReaction(index, -1)"
            >
              {{ prototypeT.moveUp }}
            </button>
            <button
              data-test-id="prototype-move-down"
              class="cursor-pointer rounded px-1.5 py-1 text-[10px] text-muted hover:bg-hover hover:text-surface disabled:opacity-40"
              :disabled="index === (frameNode.reactions?.length ?? 0) - 1"
              @click="moveReaction(index, 1)"
            >
              {{ prototypeT.moveDown }}
            </button>
            <button
              data-test-id="prototype-delete-reaction"
              class="cursor-pointer rounded px-1.5 py-1 text-[10px] text-red-300 hover:bg-red-500/10"
              @click="deleteReaction(index)"
            >
              {{ prototypeT.deleteReaction }}
            </button>
          </div>
        </div>

        <div class="grid gap-2">
          <AppSelect
            :model-value="reaction.trigger"
            :options="triggerOptions"
            :label="prototypeT.trigger"
            :test-id="`prototype-trigger-${index}`"
            @update:model-value="onTriggerChange(index, $event as PrototypeReaction['trigger'])"
          />

          <input
            v-if="reaction.trigger === 'afterDelay'"
            :value="reaction.delayMs ?? 300"
            data-test-id="prototype-delay-ms"
            type="number"
            min="0"
            class="w-full rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none"
            :aria-label="prototypeT.delayMs"
            @input="
              updateReaction(index, {
                delayMs: toNumber(($event.target as HTMLInputElement).value, 300)
              })
            "
          />

          <AppSelect
            :model-value="reaction.action"
            :options="actionOptions"
            :label="prototypeT.action"
            :test-id="`prototype-action-${index}`"
            @update:model-value="onActionChange(index, $event as PrototypeReaction['action'])"
          />

          <AppSelect
            v-if="reaction.action === 'navigate' || reaction.action === 'openOverlay'"
            :model-value="reaction.targetFrameId ?? ''"
            :options="targetFrameOptions"
            :label="prototypeT.targetFrame"
            :test-id="`prototype-target-frame-${index}`"
            @update:model-value="
              updateReaction(index, { targetFrameId: ($event as string) || undefined })
            "
          />

          <input
            v-if="reaction.action === 'externalUrl'"
            :value="reaction.externalUrl ?? ''"
            data-test-id="prototype-external-url"
            type="url"
            class="w-full rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none"
            :aria-label="prototypeT.externalUrl"
            @input="
              updateReaction(index, { externalUrl: ($event.target as HTMLInputElement).value })
            "
          />

          <AppSelect
            v-if="reaction.action === 'navigate' || reaction.action === 'openOverlay'"
            :model-value="reaction.transition ?? 'instant'"
            :options="transitionOptions"
            :label="prototypeT.transition"
            :test-id="`prototype-transition-${index}`"
            @update:model-value="
              updateReaction(index, {
                transition: $event as NonNullable<PrototypeReaction['transition']>
              })
            "
          />

          <input
            :value="reaction.transitionDurationMs ?? 300"
            data-test-id="prototype-transition-duration-ms"
            type="number"
            min="0"
            class="w-full rounded border border-border bg-input px-2 py-1 text-xs text-surface outline-none"
            :aria-label="prototypeT.transitionDurationMs"
            @input="
              updateReaction(index, {
                transitionDurationMs: toNumber(($event.target as HTMLInputElement).value, 300)
              })
            "
          />
        </div>
      </div>
    </div>
  </div>
</template>
