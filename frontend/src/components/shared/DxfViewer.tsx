import { useState, useRef, useEffect, useCallback } from 'react'
import { ZoomIn, ZoomOut, Maximize2, Eye, EyeOff } from 'lucide-react'
import type { DxfEntity } from '@/types'

interface DxfViewerProps {
  entities: DxfEntity[]
}

function calculateBounds(entities: DxfEntity[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  const update = (x: number, y: number) => {
    if (x < minX) minX = x; if (y < minY) minY = y
    if (x > maxX) maxX = x; if (y > maxY) maxY = y
  }
  entities.forEach(e => {
    switch (e.type) {
      case 'line':
        if (e.start && e.end) { update(e.start[0], e.start[1]); update(e.end[0], e.end[1]) }
        break
      case 'circle': case 'arc':
        if (e.center && e.radius) {
          update(e.center[0] - e.radius, e.center[1] - e.radius)
          update(e.center[0] + e.radius, e.center[1] + e.radius)
        }
        break
      case 'polyline':
        e.points?.forEach(p => update(p[0], p[1]))
        break
      case 'text': case 'point':
        if (e.position) update(e.position[0], e.position[1])
        break
      case 'ellipse':
        if (e.center && e.major_axis) {
          const len = Math.sqrt(e.major_axis[0] ** 2 + e.major_axis[1] ** 2)
          update(e.center[0] - len, e.center[1] - len)
          update(e.center[0] + len, e.center[1] + len)
        }
        break
    }
  })
  if (minX === Infinity) return { minX: 0, minY: 0, maxX: 1000, maxY: 1000 }
  return { minX, minY, maxX, maxY }
}

export default function DxfViewer({ entities }: DxfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1000, h: 1000 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, vx: 0, vy: 0 })
  const [layers, setLayers] = useState<Record<string, boolean>>({})
  const [showLayers, setShowLayers] = useState(false)

  const fitView = useCallback(() => {
    if (!entities.length) return
    const b = calculateBounds(entities)
    const w = (b.maxX - b.minX) || 1
    const h = (b.maxY - b.minY) || 1
    const pad = 0.05
    setViewBox({
      x: b.minX - w * pad,
      y: -(b.maxY + h * pad),
      w: w * (1 + 2 * pad),
      h: h * (1 + 2 * pad),
    })
  }, [entities])

  useEffect(() => {
    fitView()
    const layerSet: Record<string, boolean> = {}
    entities.forEach(e => { if (e.layer) layerSet[e.layer] = true })
    setLayers(layerSet)
  }, [entities, fitView])

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    setDragging(true)
    setDragStart({ x: e.clientX, y: e.clientY, vx: viewBox.x, vy: viewBox.y })
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!dragging) return
    const svg = containerRef.current?.querySelector('svg')
    if (!svg) return
    const scale = viewBox.w / svg.clientWidth
    const dx = (e.clientX - dragStart.x) * scale
    const dy = (e.clientY - dragStart.y) * scale
    setViewBox(v => ({ ...v, x: dragStart.vx - dx, y: dragStart.vy - dy }))
  }

  const handleMouseUp = () => setDragging(false)

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const factor = e.deltaY > 0 ? 1.15 : 0.87
    const svg = containerRef.current?.querySelector('svg')
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mx = (e.clientX - rect.left) / rect.width
    const my = (e.clientY - rect.top) / rect.height
    setViewBox(v => {
      const nw = v.w * factor, nh = v.h * factor
      return { x: v.x + (v.w - nw) * mx, y: v.y + (v.h - nh) * my, w: nw, h: nh }
    })
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => el.removeEventListener('wheel', handleWheel)
  }, [handleWheel])

  const zoom = (factor: number) => {
    setViewBox(v => {
      const nw = v.w * factor, nh = v.h * factor
      return { x: v.x + (v.w - nw) * 0.5, y: v.y + (v.h - nh) * 0.5, w: nw, h: nh }
    })
  }

  const toggleLayer = (name: string) => {
    setLayers(prev => ({ ...prev, [name]: !prev[name] }))
  }

  const strokeW = viewBox.w * 0.0015

  const renderEntity = (entity: DxfEntity, index: number) => {
    if (entity.layer && layers[entity.layer] === false) return null
    const color = entity.color || '#00FF88'

    switch (entity.type) {
      case 'line':
        return entity.start && entity.end ? (
          <line key={index} x1={entity.start[0]} y1={-entity.start[1]}
            x2={entity.end[0]} y2={-entity.end[1]}
            stroke={color} strokeWidth={strokeW} fill="none" />
        ) : null

      case 'circle':
        return entity.center ? (
          <circle key={index} cx={entity.center[0]} cy={-entity.center[1]}
            r={entity.radius} stroke={color} strokeWidth={strokeW} fill="none" />
        ) : null

      case 'arc': {
        if (!entity.center || !entity.radius) return null
        const sa = (entity.start_angle! * Math.PI) / 180
        const ea = (entity.end_angle! * Math.PI) / 180
        const x1 = entity.center[0] + entity.radius * Math.cos(sa)
        const y1 = -(entity.center[1] + entity.radius * Math.sin(sa))
        const x2 = entity.center[0] + entity.radius * Math.cos(ea)
        const y2 = -(entity.center[1] + entity.radius * Math.sin(ea))
        let sweep = entity.end_angle! - entity.start_angle!
        if (sweep < 0) sweep += 360
        const large = sweep > 180 ? 1 : 0
        const d = `M ${x1} ${y1} A ${entity.radius} ${entity.radius} 0 ${large} 0 ${x2} ${y2}`
        return <path key={index} d={d} stroke={color} strokeWidth={strokeW} fill="none" />
      }

      case 'polyline': {
        if (!entity.points?.length) return null
        const pts = entity.points.map(p => `${p[0]},${-p[1]}`).join(' ')
        return entity.closed
          ? <polygon key={index} points={pts} stroke={color} strokeWidth={strokeW} fill="none" />
          : <polyline key={index} points={pts} stroke={color} strokeWidth={strokeW} fill="none" />
      }

      case 'text': {
        if (!entity.position) return null
        const fs = entity.height || viewBox.h * 0.015
        return (
          <text key={index} x={entity.position[0]} y={-entity.position[1]}
            fontSize={fs} fill={color} fontFamily="monospace"
            transform={`scale(1,-1) translate(0,${2 * entity.position[1]})`}
          >{entity.text}</text>
        )
      }

      case 'point':
        if (!entity.position) return null
        return <circle key={index} cx={entity.position[0]} cy={-entity.position[1]}
          r={strokeW * 2} fill={color} />

      case 'ellipse': {
        if (!entity.center || !entity.major_axis) return null
        const rx = Math.sqrt(entity.major_axis[0] ** 2 + entity.major_axis[1] ** 2)
        const ry = rx * (entity.ratio || 0.5)
        const angle = Math.atan2(entity.major_axis[1], entity.major_axis[0]) * 180 / Math.PI
        return <ellipse key={index} cx={entity.center[0]} cy={-entity.center[1]}
          rx={rx} ry={ry}
          transform={`rotate(${-angle} ${entity.center[0]} ${-entity.center[1]})`}
          stroke={color} strokeWidth={strokeW} fill="none" />
      }

      default:
        return null
    }
  }

  const layerNames = Object.keys(layers)

  return (
    <div ref={containerRef} className="relative w-full h-full min-h-[500px]">
      {/* Toolbar */}
      <div className="absolute top-3 right-3 z-10 flex gap-2">
        <button onClick={() => zoom(0.7)} className="p-2 rounded-lg bg-dark-800/90 text-dark-300 hover:text-white border border-dark-700/50 backdrop-blur-sm">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={() => zoom(1.4)} className="p-2 rounded-lg bg-dark-800/90 text-dark-300 hover:text-white border border-dark-700/50 backdrop-blur-sm">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={fitView} className="p-2 rounded-lg bg-dark-800/90 text-dark-300 hover:text-white border border-dark-700/50 backdrop-blur-sm">
          <Maximize2 className="w-4 h-4" />
        </button>
        {layerNames.length > 1 && (
          <button onClick={() => setShowLayers(!showLayers)} className="p-2 rounded-lg bg-dark-800/90 text-dark-300 hover:text-white border border-dark-700/50 backdrop-blur-sm">
            <Eye className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Layer panel */}
      {showLayers && layerNames.length > 1 && (
        <div className="absolute top-14 right-3 z-10 w-48 p-3 rounded-xl bg-dark-800/95 border border-dark-700/50 backdrop-blur-sm max-h-64 overflow-y-auto">
          <p className="text-xs font-semibold text-dark-400 mb-2 uppercase tracking-wider">Layers</p>
          {layerNames.map(name => (
            <button key={name} onClick={() => toggleLayer(name)}
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-sm hover:bg-dark-700/50 transition-colors">
              {layers[name]
                ? <Eye className="w-3.5 h-3.5 text-primary-400" />
                : <EyeOff className="w-3.5 h-3.5 text-dark-600" />}
              <span className={layers[name] ? 'text-dark-200' : 'text-dark-600'}>{name || '(default)'}</span>
            </button>
          ))}
        </div>
      )}

      {/* SVG Canvas */}
      <svg
        className="w-full h-full rounded-xl"
        style={{ background: '#0a0f1a', cursor: dragging ? 'grabbing' : 'grab' }}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid */}
        <defs>
          <pattern id="grid" width={viewBox.w / 20} height={viewBox.h / 20} patternUnits="userSpaceOnUse">
            <path d={`M ${viewBox.w / 20} 0 L 0 0 0 ${viewBox.h / 20}`}
              fill="none" stroke="#1a2035" strokeWidth={strokeW * 0.5} />
          </pattern>
        </defs>
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill="url(#grid)" />

        {/* Entities */}
        {entities.map((entity, i) => renderEntity(entity, i))}
      </svg>
    </div>
  )
}
