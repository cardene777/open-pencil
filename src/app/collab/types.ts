import type { Color } from '@inkly/core/types'

export interface RemotePeer {
  clientId: number
  name: string
  color: Color
  /**
   * sign-in user の場合に限り awareness state に乗っている user.id。 未 sign-in は null。
   * 同 user が複数端末 / タブで接続したときの dedup key として name + color よりも優先される
   * (偶然同名の別人 dedup 誤判定を構造的に防ぐ)。
   */
  userId?: string | null
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
  /**
   * sign-in 済みの場合の自分の user.id。 未 sign-in の anonymous session では null。
   * 真の dedup (`buildRemotePeers` の userId 優先 key) を成立させるため awareness state
   * の `user.userId` field に乗せて他 client から観測できるようにする。
   */
  localUserId: string | null
}

export const DEFAULT_COLLAB_STATE: CollabState = {
  connected: false,
  roomId: null,
  peers: [],
  localName: '',
  localColor: { r: 0.5, g: 0.5, b: 0.5, a: 1 },
  localUserId: null
}
