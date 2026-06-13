import { beforeAll, describe, expect, test } from 'bun:test'

import { exportFigFile, initCodec, parseFigFile, SceneGraph } from '@inkly/core'

describe('scene graph reactions roundtrip', () => {
  beforeAll(async () => {
    await initCodec()
  })

  test('preserves SceneNode.reactions across fig export/import', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createNode('FRAME', page.id, {
      name: 'Landing',
      reactions: [
        {
          trigger: 'onClick',
          action: 'navigate',
          targetFrameId: '0:999',
          transition: 'dissolve',
          transitionDurationMs: 180
        },
        {
          trigger: 'afterDelay',
          delayMs: 1200,
          action: 'externalUrl',
          externalUrl: 'https://example.com/prototype'
        }
      ]
    })

    const exported = await exportFigFile(graph)
    const parsed = await parseFigFile(exported.buffer as ArrayBuffer)
    const frame = [...parsed.getAllNodes()].find((node) => node.name === 'Landing')

    expect(frame?.reactions).toEqual([
      {
        trigger: 'onClick',
        action: 'navigate',
        targetFrameId: '0:999',
        transition: 'dissolve',
        transitionDurationMs: 180
      },
      {
        trigger: 'afterDelay',
        delayMs: 1200,
        action: 'externalUrl',
        externalUrl: 'https://example.com/prototype'
      }
    ])
  })
})
