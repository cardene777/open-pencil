import type { SceneGraph, PrototypeReaction } from '@inkly/core/scene-graph'

export interface PrototypeRuntimeState {
  currentFrameId: string
  overlayFrameId: string | null
  history: string[]
}

function hasFrame(scene: SceneGraph, frameId: string | null | undefined): frameId is string {
  if (!frameId) return false
  return scene.getNode(frameId)?.type === 'FRAME'
}

export function executeReaction(
  state: PrototypeRuntimeState,
  reaction: PrototypeReaction,
  scene: SceneGraph
): PrototypeRuntimeState {
  if (reaction.action === 'navigate') {
    if (!hasFrame(scene, reaction.targetFrameId)) return state
    return {
      currentFrameId: reaction.targetFrameId,
      overlayFrameId: null,
      history: [...state.history, state.currentFrameId]
    }
  }

  if (reaction.action === 'openOverlay') {
    if (!hasFrame(scene, reaction.targetFrameId)) return state
    return {
      currentFrameId: state.currentFrameId,
      overlayFrameId: reaction.targetFrameId,
      history: [...state.history]
    }
  }

  if (reaction.action === 'closeOverlay') {
    if (!state.overlayFrameId) return state
    return {
      currentFrameId: state.currentFrameId,
      overlayFrameId: null,
      history: [...state.history]
    }
  }

  if (reaction.action === 'back') {
    if (state.overlayFrameId) {
      return {
        currentFrameId: state.currentFrameId,
        overlayFrameId: null,
        history: [...state.history]
      }
    }

    const previousFrameId = state.history.at(-1)
    if (!hasFrame(scene, previousFrameId)) return state
    return {
      currentFrameId: previousFrameId,
      overlayFrameId: null,
      history: state.history.slice(0, -1)
    }
  }

  return state
}
