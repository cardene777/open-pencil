/**
 * y-protocols の wire format を薄くラップする helper。
 * 公式 `y-protocols/sync` / `y-protocols/awareness` の encoder/decoder を直接使うと
 * 各 hub 経路で boilerplate が増えるため、 message type / payload の判定だけを
 * 1 関数で抽象化する。
 *
 * wire format (1 byte tag + payload)
 *   - 0x00 sync ... y-protocols/sync messages (syncStep1 / syncStep2 / update)
 *   - 0x01 awareness ... y-protocols/awareness update
 *   - 0x7F server-status ... 接続済 / 切断理由を text で送る簡易拡張
 */

export const YJS_MESSAGE_TAG = {
  SYNC: 0x00,
  AWARENESS: 0x01,
  SERVER_STATUS: 0x7f
} as const

export type YjsMessageTag = (typeof YJS_MESSAGE_TAG)[keyof typeof YJS_MESSAGE_TAG]

export function encodeServerStatus(text: string): Uint8Array {
  const body = new TextEncoder().encode(text)
  const buffer = new Uint8Array(body.length + 1)
  buffer[0] = YJS_MESSAGE_TAG.SERVER_STATUS
  buffer.set(body, 1)
  return buffer
}

export function decodeIncomingMessage(raw: Uint8Array): {
  tag: YjsMessageTag | null
  payload: Uint8Array
} {
  if (raw.length === 0) return { tag: null, payload: new Uint8Array(0) }
  const tagByte = raw[0]
  const payload = raw.subarray(1)

  if (
    tagByte === YJS_MESSAGE_TAG.SYNC ||
    tagByte === YJS_MESSAGE_TAG.AWARENESS ||
    tagByte === YJS_MESSAGE_TAG.SERVER_STATUS
  ) {
    return { tag: tagByte as YjsMessageTag, payload }
  }
  return { tag: null, payload }
}

export function wrap(tag: YjsMessageTag, payload: Uint8Array): Uint8Array {
  const buffer = new Uint8Array(payload.length + 1)
  buffer[0] = tag
  buffer.set(payload, 1)
  return buffer
}
