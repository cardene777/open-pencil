import { renderNodesToSVG } from '#core/io/formats/svg'
import type { SceneGraph, SceneNode } from '#core/scene-graph'

export interface SiteExportFile {
  path: string
  contents: string | Uint8Array
}

export interface SiteExportOptions {
  startFrameId?: string | null
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll("'", '&#39;')
}

function findPageId(graph: SceneGraph, nodeId: string): string | null {
  let current = graph.getNode(nodeId)
  while (current) {
    if (current.type === 'CANVAS') return current.id
    current = current.parentId ? graph.getNode(current.parentId) : undefined
  }
  return null
}

function collectFrames(graph: SceneGraph): SceneNode[] {
  return [...graph.getAllNodes()].filter(
    (node) => node.type === 'FRAME' && findPageId(graph, node.id) !== null
  )
}

function resolveStartFrameId(graph: SceneGraph, preferred?: string | null): string | null {
  if (preferred && graph.getNode(preferred)?.type === 'FRAME') return preferred
  return collectFrames(graph)[0]?.id ?? null
}

function frameFileName(frameId: string) {
  return `frame-${frameId}.html`
}

function frameHref(frameId: string) {
  return `frames/${frameFileName(frameId)}`
}

function renderReactionHotspots(frame: SceneNode): string {
  const reactions = frame.reactions?.filter((reaction) => reaction.trigger === 'onClick') ?? []
  if (reactions.length === 0) return ''

  return reactions
    .map((reaction, index) => {
      const transition = reaction.transition ?? 'instant'
      const duration = reaction.transitionDurationMs ?? 300
      const attrs = `class="prototype-hotspot prototype-transition-${transition}" data-reaction-index="${index}" data-transition-duration="${duration}"`

      if (
        (reaction.action === 'navigate' || reaction.action === 'openOverlay') &&
        reaction.targetFrameId
      ) {
        return `<a ${attrs} href="${escapeAttribute(frameHref(reaction.targetFrameId))}"><span class="sr-only">${escapeHtml(frame.name)}</span></a>`
      }

      if (reaction.action === 'externalUrl' && reaction.externalUrl) {
        return `<a ${attrs} href="${escapeAttribute(reaction.externalUrl)}" target="_blank" rel="noopener noreferrer"><span class="sr-only">${escapeHtml(frame.name)}</span></a>`
      }

      if (reaction.action === 'back' || reaction.action === 'closeOverlay') {
        return `<button ${attrs} type="button" data-prototype-action="${reaction.action}">${escapeHtml(frame.name)}</button>`
      }

      return ''
    })
    .join('')
}

function renderFrameDocument(graph: SceneGraph, frame: SceneNode): string {
  const pageId = findPageId(graph, frame.id)
  if (!pageId) throw new Error(`Frame ${frame.id} is not inside a page`)
  const svg =
    renderNodesToSVG(graph, pageId, [frame.id], { xmlDeclaration: false }) ??
    `<svg xmlns="http://www.w3.org/2000/svg" width="${frame.width}" height="${frame.height}" viewBox="0 0 ${frame.width} ${frame.height}"></svg>`

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(frame.name)}</title>
    <link rel="stylesheet" href="../assets/styles.css" />
    <script src="../scripts/prototype.js" defer></script>
  </head>
  <body>
    <main class="prototype-page">
      <div class="frame-shell">
        <div class="frame-title">${escapeHtml(frame.name)}</div>
        <div class="frame" data-frame-id="${escapeAttribute(frame.id)}">
          ${svg}
          ${renderReactionHotspots(frame)}
        </div>
      </div>
    </main>
  </body>
</html>`
}

function renderIndexHtml(startFrameId: string): string {
  const href = frameHref(startFrameId)
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta http-equiv="refresh" content="0; url=${escapeAttribute(href)}" />
    <title>Prototype</title>
  </head>
  <body>
    <p><a href="${escapeAttribute(href)}">Open prototype</a></p>
  </body>
</html>`
}

function renderSitemap(frames: SceneNode[]): string {
  const urls = frames
    .map((frame) => `  <url><loc>${escapeHtml(frameHref(frame.id))}</loc></url>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
}

function renderStyles(): string {
  return `:root {
  color-scheme: light dark;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Inter, system-ui, sans-serif;
  background: linear-gradient(180deg, #0f172a, #111827);
  color: #e5e7eb;
}

.prototype-page {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
}

.frame-shell {
  width: min(100%, 1280px);
}

.frame-title {
  margin-bottom: 12px;
  font-size: 14px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
}

.frame {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  background: #0b1220;
  box-shadow: 0 24px 80px rgba(15, 23, 42, 0.45);
}

.frame > svg {
  display: block;
  width: 100%;
  height: auto;
}

.prototype-hotspot {
  position: absolute;
  inset: 0;
  display: block;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.prototype-transition-instant {}
.prototype-transition-dissolve {}
.prototype-transition-slideLeft {}
.prototype-transition-slideRight {}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}`
}

function renderPrototypeScript(): string {
  return `document.addEventListener('click', (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const button = target.closest('[data-prototype-action]');
  if (!(button instanceof HTMLElement)) return;
  const action = button.dataset.prototypeAction;
  if (action === 'back' || action === 'closeOverlay') {
    event.preventDefault();
    window.history.back();
  }
});`
}

export function buildSiteExportFiles(
  graph: SceneGraph,
  options: SiteExportOptions = {}
): SiteExportFile[] {
  const frames = collectFrames(graph)
  const startFrameId = resolveStartFrameId(graph, options.startFrameId)

  if (!startFrameId) {
    throw new Error('Cannot export site without at least one frame')
  }

  return [
    {
      path: 'index.html',
      contents: renderIndexHtml(startFrameId)
    },
    ...frames.map((frame) => ({
      path: `frames/${frameFileName(frame.id)}`,
      contents: renderFrameDocument(graph, frame)
    })),
    {
      path: 'assets/styles.css',
      contents: renderStyles()
    },
    {
      path: 'scripts/prototype.js',
      contents: renderPrototypeScript()
    },
    {
      path: 'sitemap.xml',
      contents: renderSitemap(frames)
    }
  ]
}
