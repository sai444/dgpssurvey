import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { MapContainer, TileLayer, SVGOverlay, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  ZoomIn, ZoomOut, Maximize2, Eye, EyeOff, Map, Grid3X3,
  Layers, Crosshair, RotateCcw, Settings2, Move, Lock, Unlock
} from 'lucide-react'
import type { DxfEntity } from '@/types'

interface PointSettings {
  offsetX: number   // meters east/west shift
  offsetY: number   // meters north/south shift
  scale: number     // scale multiplier
  rotation: number  // degrees rotation
  opacity: number   // 0-1
}

interface MapDxfViewerProps {
  entities: DxfEntity[]
  latitude?: number
  longitude?: number
  pointSettings?: PointSettings
  onPointSettingsChange?: (settings: PointSettings) => void
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
  if (minX === Infinity) return { minX: 0, minY: 0, maxX: 100, maxY: 100 }
  return { minX, minY, maxX, maxY }
}

// Meters per degree at a given latitude
function metersPerDegLng(lat: number) {
  return 111320 * Math.cos((lat * Math.PI) / 180)
}
const METERS_PER_DEG_LAT = 111320

// Convert DXF coords (meters) to lat/lng offset from project center
function dxfToLatLng(
  x: number, y: number,
  centerLat: number, centerLng: number,
  offsetX: number, offsetY: number
): [number, number] {
  const mPerLng = metersPerDegLng(centerLat)
  const lat = centerLat + (y - offsetY) / METERS_PER_DEG_LAT
  const lng = centerLng + (x - offsetX) / mPerLng
  return [lat, lng]
}

// Inner component to control the map - only fit once on mount
function MapController({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap()
  const fitted = useRef(false)
  useEffect(() => {
    if (!fitted.current) {
      map.fitBounds(bounds, { padding: [30, 30] })
      fitted.current = true
    }
  }, [map, bounds])
  return null
}

// DXF entities rendered as SVG overlay on the map
function DxfMapOverlay({
  entities,
  layers,
  centerLat,
  centerLng,
  offsetX,
  offsetY,
  bounds,
  rotation,
  scale,
  opacity,
}: {
  entities: DxfEntity[]
  layers: Record<string, boolean>
  centerLat: number
  centerLng: number
  offsetX: number
  offsetY: number
  bounds: L.LatLngBoundsExpression
  rotation: number
  scale: number
  opacity: number
}) {
  const dxfBounds = calculateBounds(entities)
  const w = (dxfBounds.maxX - dxfBounds.minX) || 1
  const h = (dxfBounds.maxY - dxfBounds.minY) || 1
  const pad = 0.05
  const vbX = dxfBounds.minX - w * pad
  const vbY = -(dxfBounds.maxY + h * pad)
  const vbW = w * (1 + 2 * pad)
  const vbH = h * (1 + 2 * pad)
  const strokeW = vbW * 0.002

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
        const fs = entity.height || vbH * 0.015
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

  return (
    <SVGOverlay bounds={bounds} attributes={{ viewBox: `${vbX} ${vbY} ${vbW} ${vbH}` }}>
      <g opacity={opacity} transform={`rotate(${rotation} ${vbX + vbW / 2} ${vbY + vbH / 2})`}>
        {entities.map((e, i) => renderEntity(e, i))}
      </g>
    </SVGOverlay>
  )
}

// Pure SVG DXF view (no map)
function SvgDxfView({
  entities,
  layers,
}: {
  entities: DxfEntity[]
  layers: Record<string, boolean>
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 1000, h: 1000 })
  const [dragging, setDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, vx: 0, vy: 0 })

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

  useEffect(() => { fitView() }, [entities, fitView])

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

  return (
    <div ref={containerRef} className="w-full h-full">
      {/* SVG toolbar */}
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
      </div>
      <svg
        className="w-full h-full"
        style={{ background: '#0a0f1a', cursor: dragging ? 'grabbing' : 'grab' }}
        viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
        preserveAspectRatio="xMidYMid meet"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <defs>
          <pattern id="svgGrid" width={viewBox.w / 20} height={viewBox.h / 20} patternUnits="userSpaceOnUse">
            <path d={`M ${viewBox.w / 20} 0 L 0 0 0 ${viewBox.h / 20}`}
              fill="none" stroke="#1a2035" strokeWidth={strokeW * 0.5} />
          </pattern>
        </defs>
        <rect x={viewBox.x} y={viewBox.y} width={viewBox.w} height={viewBox.h} fill="url(#svgGrid)" />
        {entities.map((entity, i) => renderEntity(entity, i))}
      </svg>
    </div>
  )
}

// Drag handler for moving DXF overlay on map
function DxfDragHandler({
  isDraggable,
  onDrag,
}: {
  isDraggable: boolean
  onDrag: (deltaLat: number, deltaLng: number) => void
}) {
  const dragStart = useRef<{ lat: number; lng: number } | null>(null)

  useMapEvents({
    mousedown(e) {
      if (!isDraggable) return
      dragStart.current = { lat: e.latlng.lat, lng: e.latlng.lng }
      e.originalEvent.preventDefault()
      // Disable map dragging while we drag the overlay
      e.target.dragging.disable()
    },
    mousemove(e) {
      if (!isDraggable || !dragStart.current) return
      const dLat = e.latlng.lat - dragStart.current.lat
      const dLng = e.latlng.lng - dragStart.current.lng
      dragStart.current = { lat: e.latlng.lat, lng: e.latlng.lng }
      onDrag(dLat, dLng)
    },
    mouseup(e) {
      if (!isDraggable) return
      dragStart.current = null
      e.target.dragging.enable()
    },
  })

  return null
}

// Map tile styles
const MAP_TILES = [
  { id: 'street', label: 'Street', url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '&copy; OpenStreetMap' },
  { id: 'satellite', label: 'Satellite', url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: '&copy; Esri' },
  { id: 'topo', label: 'Terrain', url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', attr: '&copy; OpenTopoMap' },
  { id: 'dark', label: 'Dark', url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', attr: '&copy; CartoDB' },
]

export default function MapDxfViewer({ entities, latitude, longitude, pointSettings: externalSettings, onPointSettingsChange }: MapDxfViewerProps) {
  const [mode, setMode] = useState<'map' | 'drawing'>('map')
  const [tileIdx, setTileIdx] = useState(0)
  const [layers, setLayers] = useState<Record<string, boolean>>({})
  const [showLayers, setShowLayers] = useState(false)
  const [showPointSettings, setShowPointSettings] = useState(false)
  const [isDraggable, setIsDraggable] = useState(false)

  const defaultSettings: PointSettings = {
    offsetX: 0, offsetY: 0, scale: 1, rotation: 0, opacity: 1,
  }
  const [internalSettings, setInternalSettings] = useState<PointSettings>(externalSettings || defaultSettings)
  const ps = externalSettings || internalSettings

  const updateSettings = (partial: Partial<PointSettings>) => {
    const updated = { ...ps, ...partial }
    setInternalSettings(updated)
    onPointSettingsChange?.(updated)
  }

  const hasCoords = typeof latitude === 'number' && typeof longitude === 'number'
  const centerLat = latitude || 20.5937
  const centerLng = longitude || 78.9629

  useEffect(() => {
    const layerSet: Record<string, boolean> = {}
    entities.forEach(e => { if (e.layer) layerSet[e.layer] = true })
    setLayers(layerSet)
  }, [entities])

  // Calculate geographic bounds for SVG overlay
  const mapBounds = useMemo(() => {
    const b = calculateBounds(entities)
    const w = (b.maxX - b.minX) || 100
    const h = (b.maxY - b.minY) || 100
    const cx = (b.minX + b.maxX) / 2
    const cy = (b.minY + b.maxY) / 2
    const pad = 0.1
    const mPerLng = metersPerDegLng(centerLat)

    // Apply scale
    const sw = w * ps.scale
    const sh = h * ps.scale

    // Apply offset (in meters)
    const south = centerLat + (b.minY - cy - sh * pad + ps.offsetY) / METERS_PER_DEG_LAT
    const north = centerLat + (b.maxY - cy + sh * pad + ps.offsetY) / METERS_PER_DEG_LAT
    const west = centerLng + (b.minX - cx - sw * pad + ps.offsetX) / mPerLng
    const east = centerLng + (b.maxX - cx + sw * pad + ps.offsetX) / mPerLng

    // If scale != 1, adjust bounds around center
    if (ps.scale !== 1) {
      const centerLatGeo = (south + north) / 2
      const centerLngGeo = (west + east) / 2
      const halfLatSpan = ((north - south) / 2) * ps.scale
      const halfLngSpan = ((east - west) / 2) * ps.scale
      return L.latLngBounds(
        [centerLatGeo - halfLatSpan, centerLngGeo - halfLngSpan],
        [centerLatGeo + halfLatSpan, centerLngGeo + halfLngSpan]
      )
    }

    return L.latLngBounds([south, west], [north, east])
  }, [entities, centerLat, centerLng, ps.offsetX, ps.offsetY, ps.scale])

  const dxfBounds = useMemo(() => calculateBounds(entities), [entities])
  const offsetX = (dxfBounds.minX + dxfBounds.maxX) / 2
  const offsetY = (dxfBounds.minY + dxfBounds.maxY) / 2

  const toggleLayer = (name: string) => {
    setLayers(prev => ({ ...prev, [name]: !prev[name] }))
  }

  const layerNames = Object.keys(layers)
  const tile = MAP_TILES[tileIdx]

  return (
    <div className="relative w-full h-full min-h-[500px]">
      {/* Top toolbar */}
      <div className="absolute top-3 left-3 z-[1000] flex gap-2">
        {/* View mode toggle */}
        <div className="flex rounded-lg overflow-hidden border border-dark-700/50 bg-dark-800/90 backdrop-blur-sm">
          <button
            onClick={() => setMode('map')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all
              ${mode === 'map' ? 'bg-primary-500/20 text-primary-400' : 'text-dark-400 hover:text-white'}`}
          >
            <Map className="w-3.5 h-3.5" /> Map View
          </button>
          <button
            onClick={() => setMode('drawing')}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all
              ${mode === 'drawing' ? 'bg-primary-500/20 text-primary-400' : 'text-dark-400 hover:text-white'}`}
          >
            <Grid3X3 className="w-3.5 h-3.5" /> Drawing View
          </button>
        </div>

        {/* Map tile selector (only in map mode) */}
        {mode === 'map' && (
          <div className="flex rounded-lg overflow-hidden border border-dark-700/50 bg-dark-800/90 backdrop-blur-sm">
            {MAP_TILES.map((t, i) => (
              <button key={t.id} onClick={() => setTileIdx(i)}
                className={`px-3 py-2 text-xs font-medium transition-all
                  ${tileIdx === i ? 'bg-primary-500/20 text-primary-400' : 'text-dark-400 hover:text-white'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right toolbar: layers + settings */}
      <div className="absolute top-3 right-3 z-[1000] flex gap-2">
        {mode === 'map' && (
          <>
            <button
              onClick={() => setIsDraggable(!isDraggable)}
              title={isDraggable ? 'Lock drawing position' : 'Drag to move drawing'}
              className={`p-2 rounded-lg border backdrop-blur-sm transition-all ${
                isDraggable
                  ? 'bg-green-500/20 text-green-400 border-green-500/30 animate-pulse'
                  : 'bg-dark-800/90 text-dark-300 hover:text-white border-dark-700/50'
              }`}
            >
              {isDraggable ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            </button>
            <button
              onClick={() => { setShowPointSettings(!showPointSettings); setShowLayers(false) }}
              className={`p-2 rounded-lg border backdrop-blur-sm transition-all ${
                showPointSettings
                  ? 'bg-primary-500/20 text-primary-400 border-primary-500/30'
                  : 'bg-dark-800/90 text-dark-300 hover:text-white border-dark-700/50'
              }`}
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </>
        )}
        {layerNames.length > 1 && (
          <button onClick={() => { setShowLayers(!showLayers); setShowPointSettings(false) }}
            className="p-2 rounded-lg bg-dark-800/90 text-dark-300 hover:text-white border border-dark-700/50 backdrop-blur-sm">
            <Layers className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Layer panel */}
      {showLayers && layerNames.length > 1 && (
        <div className="absolute top-14 right-3 z-[1000] w-52 p-3 rounded-xl bg-dark-800/95 border border-dark-700/50 backdrop-blur-sm max-h-72 overflow-y-auto">
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

      {/* Point Settings Panel */}
      {showPointSettings && mode === 'map' && (
        <div className="absolute top-14 right-3 z-[1000] w-72 p-4 rounded-xl bg-dark-800/95 border border-dark-700/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-dark-400 uppercase tracking-wider flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5" /> Point Settings
            </p>
            <button
              onClick={() => updateSettings({ offsetX: 0, offsetY: 0, scale: 1, rotation: 0, opacity: 1 })}
              className="text-xs text-dark-500 hover:text-primary-400 flex items-center gap-1 transition-colors"
              title="Reset all"
            >
              <RotateCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          <div className="space-y-3">
            {/* Offset X */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-dark-300">Offset X (meters)</label>
                <span className="text-xs font-mono text-primary-400">{ps.offsetX.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min={-500}
                max={500}
                step={1}
                value={ps.offsetX}
                onChange={(e) => updateSettings({ offsetX: parseFloat(e.target.value) })}
                className="w-full accent-primary-500 h-1.5"
              />
              <input
                type="number"
                value={ps.offsetX}
                onChange={(e) => updateSettings({ offsetX: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 text-xs bg-dark-700/50 border border-dark-600/30 text-white rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                step={0.5}
              />
            </div>

            {/* Offset Y */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-dark-300">Offset Y (meters)</label>
                <span className="text-xs font-mono text-primary-400">{ps.offsetY.toFixed(1)}m</span>
              </div>
              <input
                type="range"
                min={-500}
                max={500}
                step={1}
                value={ps.offsetY}
                onChange={(e) => updateSettings({ offsetY: parseFloat(e.target.value) })}
                className="w-full accent-primary-500 h-1.5"
              />
              <input
                type="number"
                value={ps.offsetY}
                onChange={(e) => updateSettings({ offsetY: parseFloat(e.target.value) || 0 })}
                className="w-full mt-1 text-xs bg-dark-700/50 border border-dark-600/30 text-white rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                step={0.5}
              />
            </div>

            {/* Scale */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-dark-300">Scale</label>
                <span className="text-xs font-mono text-primary-400">{ps.scale.toFixed(2)}x</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={5}
                step={0.05}
                value={ps.scale}
                onChange={(e) => updateSettings({ scale: parseFloat(e.target.value) })}
                className="w-full accent-primary-500 h-1.5"
              />
            </div>

            {/* Rotation */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-dark-300">Rotation</label>
                <span className="text-xs font-mono text-primary-400">{ps.rotation.toFixed(0)}°</span>
              </div>
              <input
                type="range"
                min={-180}
                max={180}
                step={1}
                value={ps.rotation}
                onChange={(e) => updateSettings({ rotation: parseFloat(e.target.value) })}
                className="w-full accent-primary-500 h-1.5"
              />
            </div>

            {/* Opacity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-dark-300">Opacity</label>
                <span className="text-xs font-mono text-primary-400">{Math.round(ps.opacity * 100)}%</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={ps.opacity}
                onChange={(e) => updateSettings({ opacity: parseFloat(e.target.value) })}
                className="w-full accent-primary-500 h-1.5"
              />
            </div>
          </div>

          {/* Drag mode hint */}
          <div className="mt-3 pt-3 border-t border-dark-700/30">
            <button
              onClick={() => setIsDraggable(!isDraggable)}
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isDraggable
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-dark-700/50 text-dark-400 hover:text-white border border-dark-600/30'
              }`}
            >
              <Move className="w-3.5 h-3.5" />
              {isDraggable ? 'Drag Mode ON — drag map to move drawing' : 'Enable Drag Mode'}
            </button>
          </div>
        </div>
      )}

      {/* Coordinate info badge */}
      {mode === 'map' && hasCoords && (
        <div className="absolute bottom-3 left-3 z-[1000] px-3 py-2 rounded-lg bg-dark-800/90 border border-dark-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs">
            <Crosshair className="w-3.5 h-3.5 text-primary-400" />
            <span className="text-dark-400">Center:</span>
            <span className="text-white font-mono">{centerLat.toFixed(6)}, {centerLng.toFixed(6)}</span>
          </div>
          {(ps.offsetX !== 0 || ps.offsetY !== 0) && (
            <div className="flex items-center gap-2 text-xs mt-1">
              <Move className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-dark-400">Offset:</span>
              <span className="text-amber-400 font-mono">{ps.offsetX.toFixed(1)}m, {ps.offsetY.toFixed(1)}m</span>
            </div>
          )}
          {isDraggable && (
            <div className="text-xs text-green-400 mt-1 flex items-center gap-1">
              <Move className="w-3 h-3" /> Drag mode active — drag to move drawing
            </div>
          )}
        </div>
      )}

      {/* Entity count badge */}
      <div className="absolute bottom-3 right-3 z-[1000] px-3 py-2 rounded-lg bg-dark-800/90 border border-dark-700/50 backdrop-blur-sm">
        <span className="text-xs text-dark-400">
          <span className="text-primary-400 font-semibold">{entities.length}</span> entities loaded
        </span>
      </div>

      {/* Map Mode */}
      {mode === 'map' && (
        <MapContainer
          key={`map-${tileIdx}`}
          bounds={mapBounds}
          className="w-full h-full rounded-xl"
          style={{ background: '#0a0f1a' }}
          zoomControl={true}
          attributionControl={true}
        >
          <TileLayer url={tile.url} attribution={tile.attr} />
          <MapController bounds={mapBounds} />
          <DxfDragHandler
            isDraggable={isDraggable}
            onDrag={(dLat, dLng) => {
              const mPerLng = metersPerDegLng(centerLat)
              updateSettings({
                offsetX: ps.offsetX + dLng * mPerLng,
                offsetY: ps.offsetY + dLat * METERS_PER_DEG_LAT,
              })
            }}
          />
          <DxfMapOverlay
            entities={entities}
            layers={layers}
            centerLat={centerLat}
            centerLng={centerLng}
            offsetX={offsetX}
            offsetY={offsetY}
            bounds={mapBounds}
            rotation={ps.rotation}
            scale={ps.scale}
            opacity={ps.opacity}
          />
        </MapContainer>
      )}

      {/* Drawing Mode (pure SVG) */}
      {mode === 'drawing' && (
        <SvgDxfView entities={entities} layers={layers} />
      )}
    </div>
  )
}
