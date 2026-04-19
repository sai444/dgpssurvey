import { useState, useCallback, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Save, Plus, Trash2, Edit3, Layers, MapPin,
  Clock, X, Loader2, Check, ChevronDown, Upload, Eye,
  Navigation, Crosshair, Tag
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { projectsApi, projectMapsApi } from '@/api'
import { formatDate } from '@/utils/formatters'
import { LoadingSpinner } from '@/components/shared/Common'
import type { MapMarker, MapVersion } from '@/types'
import toast from 'react-hot-toast'

// Fix default marker icon issue in Leaflet + bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const ICON_TYPES = [
  { value: 'default', label: 'Default', emoji: '📍' },
  { value: 'survey', label: 'Survey Point', emoji: '📐' },
  { value: 'boundary', label: 'Boundary', emoji: '🔲' },
  { value: 'reference', label: 'Reference', emoji: '🎯' },
  { value: 'station', label: 'Station', emoji: '📡' },
  { value: 'landmark', label: 'Landmark', emoji: '🏛️' },
  { value: 'warning', label: 'Warning', emoji: '⚠️' },
  { value: 'note', label: 'Note', emoji: '📝' },
]

const MARKER_COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B',
  '#8B5CF6', '#EC4899', '#06B6D4', '#F97316',
]

function createColoredIcon(color: string, iconType: string) {
  const emoji = ICON_TYPES.find(t => t.value === iconType)?.emoji || '📍'
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      background: ${color};
      width: 32px; height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      display: flex; align-items: center; justify-content: center;
      border: 2px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
    "><span style="transform: rotate(45deg); font-size: 14px;">${emoji}</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  })
}

function MapClickHandler({ onMapClick, isPlacing }: { onMapClick: (lat: number, lng: number) => void, isPlacing: boolean }) {
  useMapEvents({
    click(e) {
      if (isPlacing) {
        onMapClick(e.latlng.lat, e.latlng.lng)
      }
    },
  })
  return null
}

function FlyToCenter({ lat, lng, zoom }: { lat: number, lng: number, zoom: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], zoom, { duration: 1 })
  }, [lat, lng, zoom, map])
  return null
}

export default function ProjectMapPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const mapRef = useRef<L.Map | null>(null)

  // State
  const [markers, setMarkers] = useState<MapMarker[]>([])
  const [isPlacing, setIsPlacing] = useState(false)
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null)
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null)
  const [showVersionPanel, setShowVersionPanel] = useState(true)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showEditVersionModal, setShowEditVersionModal] = useState(false)
  const [editingVersion, setEditingVersion] = useState<MapVersion | null>(null)
  const [versionName, setVersionName] = useState('')
  const [versionNotes, setVersionNotes] = useState('')
  const [newMarkerType, setNewMarkerType] = useState('default')
  const [newMarkerColor, setNewMarkerColor] = useState('#3B82F6')
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [editingMarkerLabel, setEditingMarkerLabel] = useState<{ id: string; label: string; notes: string } | null>(null)
  const [mapCenter, setMapCenter] = useState<[number, number]>([20.5937, 78.9629]) // India center
  const [mapZoom, setMapZoom] = useState(5)

  // Queries
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId!).then(r => r.data),
    enabled: !!projectId,
  })

  const { data: versions, isLoading: versionsLoading } = useQuery({
    queryKey: ['map-versions', projectId],
    queryFn: () => projectMapsApi.listVersions(projectId!).then(r => r.data),
    enabled: !!projectId,
  })

  // Set initial map center from project location
  useEffect(() => {
    if (project?.latitude && project?.longitude) {
      setMapCenter([project.latitude, project.longitude])
      setMapZoom(15)
    }
  }, [project])

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (data: any) => projectMapsApi.createVersion(projectId!, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['map-versions', projectId] })
      setActiveVersionId(res.data.id)
      setShowSaveModal(false)
      setVersionName('')
      setVersionNotes('')
      setHasUnsavedChanges(false)
      toast.success('Map version saved')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to save'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ versionId, data }: { versionId: string; data: any }) =>
      projectMapsApi.updateVersion(projectId!, versionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-versions', projectId] })
      setHasUnsavedChanges(false)
      setShowEditVersionModal(false)
      setEditingVersion(null)
      toast.success('Version updated')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (versionId: string) => projectMapsApi.deleteVersion(projectId!, versionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-versions', projectId] })
      if (activeVersionId) setActiveVersionId(null)
      setMarkers([])
      toast.success('Version deleted')
    },
  })

  // Handlers
  const handleMapClick = useCallback((lat: number, lng: number) => {
    const newMarker: MapMarker = {
      id: crypto.randomUUID(),
      lat,
      lng,
      label: `Point ${markers.length + 1}`,
      icon_type: newMarkerType,
      color: newMarkerColor,
      notes: '',
    }
    setMarkers(prev => [...prev, newMarker])
    setHasUnsavedChanges(true)
    setIsPlacing(false)
  }, [markers.length, newMarkerType, newMarkerColor])

  const handleDeleteMarker = useCallback((markerId: string) => {
    setMarkers(prev => prev.filter(m => m.id !== markerId))
    setSelectedMarker(null)
    setHasUnsavedChanges(true)
  }, [])

  const handleUpdateMarkerLabel = useCallback(() => {
    if (!editingMarkerLabel) return
    setMarkers(prev => prev.map(m =>
      m.id === editingMarkerLabel.id
        ? { ...m, label: editingMarkerLabel.label, notes: editingMarkerLabel.notes }
        : m
    ))
    setEditingMarkerLabel(null)
    setHasUnsavedChanges(true)
  }, [editingMarkerLabel])

  const handleLoadVersion = useCallback((version: MapVersion) => {
    setMarkers(version.markers || [])
    setActiveVersionId(version.id)
    if (version.center_lat && version.center_lng) {
      setMapCenter([parseFloat(version.center_lat), parseFloat(version.center_lng)])
      setMapZoom(version.zoom_level || 13)
    }
    setHasUnsavedChanges(false)
  }, [])

  const handleSaveNewVersion = () => {
    const map = mapRef.current
    const center = map?.getCenter()
    const zoom = map?.getZoom()
    saveMutation.mutate({
      version_name: versionName,
      markers,
      center_lat: center?.lat?.toString() || mapCenter[0].toString(),
      center_lng: center?.lng?.toString() || mapCenter[1].toString(),
      zoom_level: zoom || mapZoom,
      notes: versionNotes,
    })
  }

  const handleUpdateExistingVersion = () => {
    if (!activeVersionId) return
    const map = mapRef.current
    const center = map?.getCenter()
    const zoom = map?.getZoom()
    updateMutation.mutate({
      versionId: activeVersionId,
      data: {
        markers,
        center_lat: center?.lat?.toString() || mapCenter[0].toString(),
        center_lng: center?.lng?.toString() || mapCenter[1].toString(),
        zoom_level: zoom || mapZoom,
      },
    })
  }

  const handleEditVersionName = (version: MapVersion) => {
    setEditingVersion(version)
    setVersionName(version.version_name)
    setVersionNotes(version.notes || '')
    setShowEditVersionModal(true)
  }

  const handleSaveEditedVersion = () => {
    if (!editingVersion) return
    updateMutation.mutate({
      versionId: editingVersion.id,
      data: {
        version_name: versionName,
        notes: versionNotes,
      },
    })
  }

  if (projectLoading) return <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-dark-900/80 border-b border-dark-700/30">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/projects')} className="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-display font-bold text-white">Survey Map</h1>
              {project && (
                <span className="text-xs font-mono text-dark-500 bg-dark-800 px-2 py-0.5 rounded">
                  {project.project_number}
                </span>
              )}
            </div>
            <p className="text-xs text-dark-500">{project?.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Place Marker Button */}
          <div className="flex items-center gap-1 mr-2">
            <select
              value={newMarkerType}
              onChange={(e) => setNewMarkerType(e.target.value)}
              className="text-xs bg-dark-800 border border-dark-700/30 text-dark-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              {ICON_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
              ))}
            </select>
            <div className="flex gap-0.5">
              {MARKER_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewMarkerColor(c)}
                  className={`w-5 h-5 rounded-full border-2 transition-all ${newMarkerColor === c ? 'border-white scale-125' : 'border-dark-600'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsPlacing(!isPlacing)}
            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              isPlacing
                ? 'bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse'
                : 'bg-dark-800 text-dark-300 border border-dark-700/30 hover:text-white'
            }`}
          >
            <Crosshair className="w-4 h-4" />
            {isPlacing ? 'Click Map to Place' : 'Place Marker'}
          </button>

          <button
            onClick={() => setShowVersionPanel(!showVersionPanel)}
            className={`px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
              showVersionPanel ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30' : 'bg-dark-800 text-dark-300 border border-dark-700/30'
            }`}
          >
            <Layers className="w-4 h-4" />
            Versions
          </button>

          {/* Save buttons */}
          {hasUnsavedChanges && activeVersionId && (
            <button
              onClick={handleUpdateExistingVersion}
              disabled={updateMutation.isPending}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-2 hover:bg-amber-500/30 transition-all"
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Update Version
            </button>
          )}

          <button
            onClick={() => {
              setVersionName('')
              setVersionNotes('')
              setShowSaveModal(true)
            }}
            disabled={markers.length === 0}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-primary-500/20 text-primary-400 border border-primary-500/30 flex items-center gap-2 hover:bg-primary-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            Save New Version
          </button>
        </div>
      </div>

      {/* Map + Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={mapCenter}
            zoom={mapZoom}
            className="h-full w-full"
            ref={mapRef}
            style={{ background: '#1a1a2e' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onMapClick={handleMapClick} isPlacing={isPlacing} />
            {mapCenter[0] !== 20.5937 && (
              <FlyToCenter lat={mapCenter[0]} lng={mapCenter[1]} zoom={mapZoom} />
            )}

            {markers.map((marker) => (
              <Marker
                key={marker.id}
                position={[marker.lat, marker.lng]}
                icon={createColoredIcon(marker.color || '#3B82F6', marker.icon_type || 'default')}
                eventHandlers={{
                  click: () => setSelectedMarker(marker.id),
                }}
              >
                <Popup>
                  <div className="min-w-[200px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-sm">{marker.label || 'Unnamed'}</span>
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 rounded">
                        {ICON_TYPES.find(t => t.value === marker.icon_type)?.emoji} {ICON_TYPES.find(t => t.value === marker.icon_type)?.label}
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 space-y-1 mb-2">
                      <p>Lat: {marker.lat.toFixed(6)}</p>
                      <p>Lng: {marker.lng.toFixed(6)}</p>
                      {marker.notes && <p className="mt-1 text-gray-700">{marker.notes}</p>}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingMarkerLabel({ id: marker.id, label: marker.label || '', notes: marker.notes || '' })}
                        className="text-xs px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMarker(marker.id)}
                        className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>

          {/* Marker count badge */}
          <div className="absolute top-4 left-4 z-[1000] bg-dark-900/90 backdrop-blur-sm rounded-xl px-4 py-2 border border-dark-700/30">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary-400" />
              <span className="text-white font-medium">{markers.length}</span>
              <span className="text-dark-400">markers</span>
              {activeVersionId && (
                <>
                  <span className="text-dark-600">•</span>
                  <Tag className="w-3 h-3 text-green-400" />
                  <span className="text-green-400 text-xs">
                    {versions?.find((v: MapVersion) => v.id === activeVersionId)?.version_name}
                  </span>
                </>
              )}
              {hasUnsavedChanges && (
                <span className="text-amber-400 text-xs ml-1">(unsaved)</span>
              )}
            </div>
          </div>

          {/* Placing hint */}
          {isPlacing && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-green-500/90 backdrop-blur-sm rounded-xl px-6 py-3 text-white text-sm font-medium flex items-center gap-2 animate-bounce">
              <Crosshair className="w-4 h-4" />
              Click anywhere on the map to place a marker
            </div>
          )}
        </div>

        {/* Version Sidebar */}
        <AnimatePresence>
          {showVersionPanel && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="h-full bg-dark-900/95 border-l border-dark-700/30 overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-dark-700/30">
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary-400" />
                    Map Versions
                  </h3>
                  <button onClick={() => setShowVersionPanel(false)} className="text-dark-400 hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {versionsLoading ? (
                  <div className="flex justify-center py-8"><LoadingSpinner /></div>
                ) : !versions?.length ? (
                  <div className="text-center py-8">
                    <Layers className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                    <p className="text-dark-400 text-sm">No versions saved yet</p>
                    <p className="text-dark-500 text-xs mt-1">Place markers and save a version</p>
                  </div>
                ) : (
                  versions.map((version: MapVersion) => (
                    <motion.div
                      key={version.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`rounded-xl border p-3 transition-all cursor-pointer group ${
                        activeVersionId === version.id
                          ? 'bg-primary-500/10 border-primary-500/30'
                          : 'bg-dark-800/40 border-dark-700/20 hover:border-dark-600/40'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0" onClick={() => handleLoadVersion(version)}>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-dark-500">v{version.version_number}</span>
                            {activeVersionId === version.id && (
                              <Check className="w-3 h-3 text-green-400" />
                            )}
                          </div>
                          <h4 className="font-medium text-white text-sm truncate">{version.version_name}</h4>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEditVersionName(version) }}
                            className="p-1 rounded hover:bg-dark-700 text-dark-400 hover:text-white"
                            title="Edit version name"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleLoadVersion(version) }}
                            className="p-1 rounded hover:bg-dark-700 text-dark-400 hover:text-primary-400"
                            title="Load version"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              if (confirm('Delete this version?')) deleteMutation.mutate(version.id)
                            }}
                            className="p-1 rounded hover:bg-dark-700 text-dark-400 hover:text-red-400"
                            title="Delete version"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-dark-500" onClick={() => handleLoadVersion(version)}>
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {(version.markers || []).length} markers
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(version.created_at)}
                        </span>
                      </div>
                      {version.notes && (
                        <p className="text-xs text-dark-400 mt-2 line-clamp-2">{version.notes}</p>
                      )}
                    </motion.div>
                  ))
                )}
              </div>

              {/* Markers list for active version */}
              {markers.length > 0 && (
                <div className="border-t border-dark-700/30 p-3 max-h-[30%] overflow-y-auto">
                  <h4 className="text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">
                    Current Markers ({markers.length})
                  </h4>
                  <div className="space-y-1">
                    {markers.map((marker, i) => (
                      <div
                        key={marker.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-dark-800/60 group text-xs"
                      >
                        <div className="w-3 h-3 rounded-full" style={{ background: marker.color || '#3B82F6' }} />
                        <span className="text-white flex-1 truncate">{marker.label || `Point ${i + 1}`}</span>
                        <span className="text-dark-500 font-mono text-[10px]">
                          {marker.lat.toFixed(4)}, {marker.lng.toFixed(4)}
                        </span>
                        <button
                          onClick={() => handleDeleteMarker(marker.id)}
                          className="opacity-0 group-hover:opacity-100 text-dark-400 hover:text-red-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Save New Version Modal */}
      <AnimatePresence>
        {showSaveModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
            onClick={() => setShowSaveModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-md"
            >
              <div className="flex items-center justify-between p-6 border-b border-dark-700/30">
                <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <Upload className="w-5 h-5 text-primary-400" />
                  Save Map Version
                </h2>
                <button onClick={() => setShowSaveModal(false)} className="text-dark-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Version Name *</label>
                  <input
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                    placeholder="e.g., Initial Survey v1"
                    className="input-field"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Notes</label>
                  <textarea
                    value={versionNotes}
                    onChange={(e) => setVersionNotes(e.target.value)}
                    placeholder="Optional notes about this version..."
                    className="input-field h-20 resize-none"
                  />
                </div>
                <div className="bg-dark-800/40 rounded-xl p-3 border border-dark-700/20">
                  <p className="text-xs text-dark-400">
                    <span className="text-white font-medium">{markers.length}</span> markers will be saved
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowSaveModal(false)} className="btn-secondary flex-1">Cancel</button>
                  <button
                    onClick={handleSaveNewVersion}
                    disabled={!versionName.trim() || saveMutation.isPending}
                    className="btn-primary flex-1"
                  >
                    {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Version'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Version Name Modal */}
      <AnimatePresence>
        {showEditVersionModal && editingVersion && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
            onClick={() => setShowEditVersionModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-md"
            >
              <div className="flex items-center justify-between p-6 border-b border-dark-700/30">
                <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-primary-400" />
                  Edit Version
                </h2>
                <button onClick={() => setShowEditVersionModal(false)} className="text-dark-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Version Name</label>
                  <input
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                    className="input-field"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Notes</label>
                  <textarea
                    value={versionNotes}
                    onChange={(e) => setVersionNotes(e.target.value)}
                    className="input-field h-20 resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowEditVersionModal(false)} className="btn-secondary flex-1">Cancel</button>
                  <button
                    onClick={handleSaveEditedVersion}
                    disabled={!versionName.trim() || updateMutation.isPending}
                    className="btn-primary flex-1"
                  >
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Marker Label Modal */}
      <AnimatePresence>
        {editingMarkerLabel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
            onClick={() => setEditingMarkerLabel(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-sm"
            >
              <div className="flex items-center justify-between p-5 border-b border-dark-700/30">
                <h2 className="text-lg font-display font-bold text-white">Edit Marker</h2>
                <button onClick={() => setEditingMarkerLabel(null)} className="text-dark-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Label</label>
                  <input
                    value={editingMarkerLabel.label}
                    onChange={(e) => setEditingMarkerLabel({ ...editingMarkerLabel, label: e.target.value })}
                    className="input-field"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Notes</label>
                  <textarea
                    value={editingMarkerLabel.notes}
                    onChange={(e) => setEditingMarkerLabel({ ...editingMarkerLabel, notes: e.target.value })}
                    className="input-field h-20 resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setEditingMarkerLabel(null)} className="btn-secondary flex-1">Cancel</button>
                  <button onClick={handleUpdateMarkerLabel} className="btn-primary flex-1">Save</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
