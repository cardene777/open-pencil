export interface SpatialIndexBounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface SpatialIndexViewport {
  width: number
  height: number
  panX: number
  panY: number
  zoom: number
}

const DEFAULT_VIEWPORT: SpatialIndexViewport = {
  width: 1024,
  height: 768,
  panX: 0,
  panY: 0,
  zoom: 1
}

const GRID_CELL_DIVISOR = 8
const GRID_NEIGHBOR_RADIUS = 1
const MIN_CELL_SIZE = 32
const MAX_CELL_SIZE = 2048
const CELL_EPSILON = 1e-6

function clampCellSize(size: number): number {
  return Math.max(MIN_CELL_SIZE, Math.min(MAX_CELL_SIZE, size))
}

function normalizeViewport(viewport: Partial<SpatialIndexViewport> | undefined): SpatialIndexViewport {
  const zoom = Math.max(viewport?.zoom ?? DEFAULT_VIEWPORT.zoom, 0.02)
  return {
    width: Math.max(viewport?.width ?? DEFAULT_VIEWPORT.width, 1),
    height: Math.max(viewport?.height ?? DEFAULT_VIEWPORT.height, 1),
    panX: viewport?.panX ?? DEFAULT_VIEWPORT.panX,
    panY: viewport?.panY ?? DEFAULT_VIEWPORT.panY,
    zoom
  }
}

function viewportCellSize(viewport: SpatialIndexViewport): number {
  const visibleWidth = viewport.width / viewport.zoom
  return clampCellSize(visibleWidth / GRID_CELL_DIVISOR)
}

function viewportOriginX(viewport: SpatialIndexViewport): number {
  return -viewport.panX / viewport.zoom
}

function viewportOriginY(viewport: SpatialIndexViewport): number {
  return -viewport.panY / viewport.zoom
}

export class SpatialIndex {
  private cells = new Map<string, Set<string>>()
  private nodeCells = new Map<string, string[]>()
  private nodeBounds = new Map<string, SpatialIndexBounds>()
  private viewport = DEFAULT_VIEWPORT
  private cellSize = viewportCellSize(DEFAULT_VIEWPORT)
  private originX = viewportOriginX(DEFAULT_VIEWPORT)
  private originY = viewportOriginY(DEFAULT_VIEWPORT)

  getCellSize(): number {
    return this.cellSize
  }

  getViewport(): SpatialIndexViewport {
    return { ...this.viewport }
  }

  clear(): void {
    this.cells.clear()
    this.nodeCells.clear()
    this.nodeBounds.clear()
  }

  setViewport(nextViewport: Partial<SpatialIndexViewport>): boolean {
    const viewport = normalizeViewport(nextViewport)
    const nextCellSize = viewportCellSize(viewport)
    const nextOriginX = viewportOriginX(viewport)
    const nextOriginY = viewportOriginY(viewport)
    const changed =
      viewport.width !== this.viewport.width ||
      viewport.height !== this.viewport.height ||
      viewport.panX !== this.viewport.panX ||
      viewport.panY !== this.viewport.panY ||
      viewport.zoom !== this.viewport.zoom ||
      nextCellSize !== this.cellSize ||
      nextOriginX !== this.originX ||
      nextOriginY !== this.originY

    this.viewport = viewport
    this.cellSize = nextCellSize
    this.originX = nextOriginX
    this.originY = nextOriginY

    return changed
  }

  rebuild(
    nodeIds: Iterable<string>,
    getBounds: (nodeId: string) => SpatialIndexBounds | null | undefined
  ): void {
    this.cells.clear()
    this.nodeCells.clear()
    this.nodeBounds.clear()

    for (const nodeId of nodeIds) {
      const bounds = getBounds(nodeId)
      if (!bounds) continue
      this.add(nodeId, bounds)
    }
  }

  add(nodeId: string, bounds: SpatialIndexBounds): void {
    this.remove(nodeId)
    this.nodeBounds.set(nodeId, bounds)

    const keys = this.collectCellKeys(bounds)
    this.nodeCells.set(nodeId, keys)
    for (const key of keys) {
      let cell = this.cells.get(key)
      if (!cell) {
        cell = new Set()
        this.cells.set(key, cell)
      }
      cell.add(nodeId)
    }
  }

  update(nodeId: string, bounds: SpatialIndexBounds): void {
    this.add(nodeId, bounds)
  }

  remove(nodeId: string): void {
    const keys = this.nodeCells.get(nodeId)
    if (keys) {
      for (const key of keys) {
        const cell = this.cells.get(key)
        if (!cell) continue
        cell.delete(nodeId)
        if (cell.size === 0) this.cells.delete(key)
      }
    }

    this.nodeCells.delete(nodeId)
    this.nodeBounds.delete(nodeId)
  }

  queryPoint(x: number, y: number): Set<string> {
    const hits = new Set<string>()
    const centerCol = this.cellCoord(x, this.originX)
    const centerRow = this.cellCoord(y, this.originY)

    for (let dx = -GRID_NEIGHBOR_RADIUS; dx <= GRID_NEIGHBOR_RADIUS; dx++) {
      for (let dy = -GRID_NEIGHBOR_RADIUS; dy <= GRID_NEIGHBOR_RADIUS; dy++) {
        const key = this.cellKey(centerCol + dx, centerRow + dy)
        const cell = this.cells.get(key)
        if (!cell) continue
        for (const nodeId of cell) {
          if (hits.has(nodeId)) continue
          const bounds = this.nodeBounds.get(nodeId)
          if (!bounds || !this.intersectsPoint(bounds, x, y)) continue
          hits.add(nodeId)
        }
      }
    }

    return hits
  }

  private collectCellKeys(bounds: SpatialIndexBounds): string[] {
    const minCol = this.cellCoord(bounds.minX, this.originX)
    const maxCol = this.cellCoord(Math.max(bounds.minX, bounds.maxX - CELL_EPSILON), this.originX)
    const minRow = this.cellCoord(bounds.minY, this.originY)
    const maxRow = this.cellCoord(Math.max(bounds.minY, bounds.maxY - CELL_EPSILON), this.originY)
    const keys: string[] = []

    for (let col = minCol; col <= maxCol; col++) {
      for (let row = minRow; row <= maxRow; row++) {
        keys.push(this.cellKey(col, row))
      }
    }

    return keys
  }

  private cellCoord(value: number, origin: number): number {
    return Math.floor((value - origin) / this.cellSize)
  }

  private cellKey(col: number, row: number): string {
    return `${col}:${row}`
  }

  private intersectsPoint(bounds: SpatialIndexBounds, x: number, y: number): boolean {
    return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY
  }
}
