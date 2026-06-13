import type { Color } from '@inkly/core/types'

export interface RemotePeer {
  clientId: number
  name: string
  color: Color
  cursor?: { x: number; y: number; pageId: string }
  selection?: string[]
  /**
   * 一定時間 (`PEER_IDLE_THRESHOLD_MS`) 以上 cursor / selection 更新が観測されていない
   * peer は idle 扱いにし、 UI 側で半透明表示にする。 awareness で「見ているけれど
   * 操作していない user」を視覚的に区別する用途。
   */
  isIdle?: boolean
}

export interface CollabState {
  connected: boolean
  roomId: string | null
  peers: RemotePeer[]
  localName: string
  localColor: Color
}

export const DEFAULT_COLLAB_STATE: CollabState = {
  connected: false,
  roomId: null,
  peers: [],
  localName: '',
  localColor: { r: 0.5, g: 0.5, b: 0.5, a: 1 }
}
