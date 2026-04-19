import { useState, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Edit3, Save, X, MapPin, Calendar, Ruler, Upload,
  FileText, Image, File, Trash2, Download, Eye, Loader2,
  FolderOpen, Pen, ChevronDown, Map, Layers, Clock, Check, Copy
} from 'lucide-react'
import { projectsApi, clientsApi, surveyorsApi, documentsApi, autocadApi } from '@/api'
import { formatDate } from '@/utils/formatters'
import { LoadingSpinner, EmptyState } from '@/components/shared/Common'
import StatusBadge from '@/components/shared/StatusBadge'
import MapDxfViewer from '@/components/shared/MapDxfViewer'
import type { Project, ProjectDocument, DxfEntity, DrawingVersion } from '@/types'
import toast from 'react-hot-toast'

const tabs = [
  { id: 'overview', label: 'Overview', icon: FolderOpen },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'drawing', label: 'Drawing & Map', icon: Map },
]

function formatFileSize(bytes?: number) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getFileIcon(type?: string) {
  switch (type) {
    case 'pdf': return FileText
    case 'image': return Image
    case 'autocad_dxf': case 'autocad_dwg': return Pen
    default: return File
  }
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('overview')
  const [editing, setEditing] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string; type: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dxfInputRef = useRef<HTMLInputElement>(null)

  // Queries
  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectsApi.get(id!).then(r => r.data),
    enabled: !!id,
  })

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list().then(r => r.data),
  })

  const { data: surveyors } = useQuery({
    queryKey: ['surveyors'],
    queryFn: () => surveyorsApi.list().then(r => r.data),
  })

  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ['documents', id],
    queryFn: () => documentsApi.list(id!).then(r => r.data),
    enabled: !!id,
  })

  const { data: drawingData, isLoading: drawingLoading } = useQuery({
    queryKey: ['drawing', id],
    queryFn: () => autocadApi.getEntities(id!).then(r => r.data),
    enabled: !!id,
  })

  // Edit form
  const [form, setForm] = useState<any>(null)

  const startEdit = () => {
    if (!project) return
    setForm({
      title: project.title || '',
      description: project.description || '',
      client_id: project.client_id || '',
      surveyor_id: project.surveyor_id || '',
      priority: project.priority || 'medium',
      status: project.status || 'draft',
      location: project.location || '',
      latitude: project.latitude?.toString() || '',
      longitude: project.longitude?.toString() || '',
      area_sqm: project.area_sqm?.toString() || '',
      start_date: project.start_date || '',
      end_date: project.end_date || '',
    })
    setEditing(true)
  }

  const updateMutation = useMutation({
    mutationFn: (data: any) => projectsApi.update(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] })
      setEditing(false)
      toast.success('Project updated')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update'),
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate({
      ...form,
      client_id: form.client_id || undefined,
      surveyor_id: form.surveyor_id || undefined,
      latitude: form.latitude ? parseFloat(form.latitude) : undefined,
      longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      area_sqm: form.area_sqm ? parseFloat(form.area_sqm) : undefined,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
    })
  }

  // Document uploads
  const uploadMutation = useMutation({
    mutationFn: ({ file, desc }: { file: File; desc?: string }) => documentsApi.upload(id!, file, desc),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
      toast.success('File uploaded')
    },
    onError: () => toast.error('Upload failed'),
  })

  const deleteMutation = useMutation({
    mutationFn: (docId: string) => documentsApi.delete(id!, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
      toast.success('File deleted')
    },
    onError: () => toast.error('Delete failed'),
  })

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    Array.from(files).forEach(file => uploadMutation.mutate({ file }))
    e.target.value = ''
  }

  const handleDownload = async (doc: ProjectDocument) => {
    try {
      const res = await documentsApi.download(id!, doc.id)
      const url = URL.createObjectURL(res.data)
      const a = document.createElement('a')
      a.href = url
      a.download = doc.file_name || 'download'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Download failed')
    }
  }

  const handlePreview = async (doc: ProjectDocument) => {
    try {
      const res = await documentsApi.download(id!, doc.id)
      const url = URL.createObjectURL(res.data)
      setPreviewDoc({ url, name: doc.file_name || 'file', type: doc.file_type || '' })
    } catch {
      toast.error('Preview failed')
    }
  }

  // DXF upload
  const dxfUploadMutation = useMutation({
    mutationFn: (file: File) => autocadApi.uploadDxf(id!, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing', id] })
      queryClient.invalidateQueries({ queryKey: ['drawing-versions', id] })
      queryClient.invalidateQueries({ queryKey: ['documents', id] })
      toast.success('DXF file imported & saved as version')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to import DXF'),
  })

  const handleDxfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) dxfUploadMutation.mutate(file)
    e.target.value = ''
  }

  // Drawing versions
  const { data: drawingVersions, isLoading: versionsLoading } = useQuery({
    queryKey: ['drawing-versions', id],
    queryFn: () => autocadApi.listVersions(id!).then(r => r.data),
    enabled: !!id,
  })

  const [activeVersionId, setActiveVersionId] = useState<string | null>(null)
  const [viewingEntities, setViewingEntities] = useState<DxfEntity[] | null>(null)
  const [showSaveVersionModal, setShowSaveVersionModal] = useState(false)
  const [showEditVersionModal, setShowEditVersionModal] = useState(false)
  const [editingVersion, setEditingVersion] = useState<DrawingVersion | null>(null)
  const [versionName, setVersionName] = useState('')
  const [versionNotes, setVersionNotes] = useState('')

  const saveVersionMutation = useMutation({
    mutationFn: (data: any) => autocadApi.createVersion(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing-versions', id] })
      setShowSaveVersionModal(false)
      setVersionName('')
      setVersionNotes('')
      toast.success('Drawing version saved')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to save version'),
  })

  const updateVersionMutation = useMutation({
    mutationFn: ({ versionId, data }: { versionId: string; data: any }) =>
      autocadApi.updateVersion(id!, versionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawing-versions', id] })
      setShowEditVersionModal(false)
      setEditingVersion(null)
      toast.success('Version updated')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update'),
  })

  const deleteVersionMutation = useMutation({
    mutationFn: (versionId: string) => autocadApi.deleteVersion(id!, versionId),
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['drawing-versions', id] })
      if (activeVersionId === deletedId) {
        setActiveVersionId(null)
        setViewingEntities(null)
      }
      toast.success('Version deleted')
    },
  })

  const handleLoadVersion = useCallback((version: DrawingVersion) => {
    setActiveVersionId(version.id)
    setViewingEntities(version.dxf_entities || [])
  }, [])

  const handleSaveNewVersion = () => {
    const entities = viewingEntities || drawingData?.entities || []
    saveVersionMutation.mutate({
      version_name: versionName,
      dxf_entities: entities,
      annotations: drawingData?.annotations || [],
      notes: versionNotes,
    })
  }

  const handleEditVersionName = (version: DrawingVersion) => {
    setEditingVersion(version)
    setVersionName(version.version_name)
    setVersionNotes(version.notes || '')
    setShowEditVersionModal(true)
  }

  const handleSaveEditedVersion = () => {
    if (!editingVersion) return
    const entities = activeVersionId === editingVersion.id && viewingEntities
      ? viewingEntities
      : undefined
    updateVersionMutation.mutate({
      versionId: editingVersion.id,
      data: {
        version_name: versionName,
        notes: versionNotes,
        ...(entities ? { dxf_entities: entities } : {}),
      },
    })
  }

  // Save drawing (legacy)
  const saveDrawingMutation = useMutation({
    mutationFn: (data: any) => autocadApi.saveDrawing(id!, data),
    onSuccess: () => toast.success('Drawing saved'),
    onError: () => toast.error('Save failed'),
  })

  // Which entities to display
  const displayEntities = viewingEntities || drawingData?.entities || []

  if (isLoading) return <div className="flex items-center justify-center h-full"><LoadingSpinner /></div>
  if (!project) return <EmptyState icon={FolderOpen} title="Project not found" description="This project may have been deleted" />

  const clientName = clients?.find((c: any) => c.id === project.client_id)?.company_name
  const surveyorData = surveyors?.find((s: any) => s.id === project.surveyor_id)

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <button onClick={() => navigate('/projects')}
          className="mt-1 p-2 rounded-xl bg-dark-800/50 text-dark-400 hover:text-white border border-dark-700/30 transition-all hover:border-dark-600/50">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-mono text-dark-500 mb-1">{project.project_number}</p>
          <h1 className="text-2xl font-display font-bold text-white truncate">{project.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <StatusBadge status={project.status} />
            <StatusBadge status={project.priority} />
            {project.location && (
              <span className="flex items-center gap-1 text-xs text-dark-500">
                <MapPin className="w-3 h-3" /> {project.location}
              </span>
            )}
          </div>
        </div>
        {!editing && (
          <button onClick={startEdit} className="btn-primary">
            <Edit3 className="w-4 h-4" /> Edit
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-dark-800/30 rounded-xl border border-dark-700/20 w-fit">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all
              ${activeTab === tab.id
                ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                : 'text-dark-400 hover:text-white'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {editing && form ? (
              <form onSubmit={handleSave} className="glass-card p-6 space-y-4">
                <h2 className="text-lg font-display font-bold text-white mb-4">Edit Project</h2>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Title *</label>
                  <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Description</label>
                  <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="input-field h-24 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Client</label>
                    <select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} className="input-field">
                      <option value="">Select client</option>
                      {clients?.map((c: any) => <option key={c.id} value={c.id}>{c.company_name || c.email}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Surveyor</label>
                    <select value={form.surveyor_id} onChange={e => setForm({ ...form, surveyor_id: e.target.value })} className="input-field">
                      <option value="">Select surveyor</option>
                      {surveyors?.map((s: any) => <option key={s.id} value={s.id}>{s.user?.full_name || s.specialization || 'Surveyor'}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Priority</label>
                    <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="input-field">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Status</label>
                    <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })} className="input-field">
                      {['draft', 'quoted', 'approved', 'in_progress', 'completed', 'on_hold', 'cancelled'].map(s => (
                        <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Location</label>
                  <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} className="input-field" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Latitude</label>
                    <input type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Longitude</label>
                    <input type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Area (sqm)</label>
                    <input type="number" step="any" value={form.area_sqm} onChange={e => setForm({ ...form, area_sqm: e.target.value })} className="input-field" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Start Date</label>
                    <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">End Date</label>
                    <input type="date" value={form.end_date} onChange={e => setForm({ ...form, end_date: e.target.value })} className="input-field" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditing(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={updateMutation.isPending} className="btn-primary flex-1">
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
                  </button>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Info */}
                <div className="lg:col-span-2 glass-card p-6">
                  <h2 className="text-lg font-display font-bold text-white mb-4">Project Details</h2>
                  {project.description && (
                    <p className="text-dark-300 mb-6 leading-relaxed">{project.description}</p>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {project.location && (
                      <InfoItem icon={MapPin} label="Location" value={project.location} />
                    )}
                    {project.area_sqm && (
                      <InfoItem icon={Ruler} label="Area" value={`${project.area_sqm} sqm`} />
                    )}
                    {project.start_date && (
                      <InfoItem icon={Calendar} label="Start Date" value={formatDate(project.start_date)} />
                    )}
                    {project.end_date && (
                      <InfoItem icon={Calendar} label="End Date" value={formatDate(project.end_date)} />
                    )}
                    {project.latitude && project.longitude && (
                      <InfoItem icon={MapPin} label="Coordinates" value={`${project.latitude}, ${project.longitude}`} />
                    )}
                  </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-4">
                  <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">Status</h3>
                    <StatusBadge status={project.status} />
                  </div>
                  <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">Priority</h3>
                    <StatusBadge status={project.priority} />
                  </div>
                  {clientName && (
                    <div className="glass-card p-5">
                      <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">Client</h3>
                      <p className="text-white">{clientName}</p>
                    </div>
                  )}
                  {surveyorData && (
                    <div className="glass-card p-5">
                      <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">Surveyor</h3>
                      <p className="text-white">{surveyorData.user?.full_name || 'Assigned'}</p>
                      {surveyorData.specialization && (
                        <p className="text-xs text-dark-500 mt-1">{surveyorData.specialization}</p>
                      )}
                      {surveyorData.license_number && (
                        <p className="text-xs text-dark-500 mt-0.5">Lic: {surveyorData.license_number}</p>
                      )}
                    </div>
                  )}
                  <div className="glass-card p-5">
                    <h3 className="text-sm font-semibold text-dark-400 uppercase tracking-wider mb-3">Timeline</h3>
                    <p className="text-xs text-dark-500">Created {formatDate(project.created_at)}</p>
                    {project.updated_at && (
                      <p className="text-xs text-dark-500 mt-1">Updated {formatDate(project.updated_at)}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'documents' && (
          <motion.div key="documents" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="glass-card p-6">
              {/* Upload Area */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-display font-bold text-white">Documents</h2>
                <div>
                  <input ref={fileInputRef} type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.gif,.dwg,.dxf,.geojson,.json" className="hidden" onChange={handleFileUpload} />
                  <button onClick={() => fileInputRef.current?.click()} disabled={uploadMutation.isPending}
                    className="btn-primary">
                    {uploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload Files
                  </button>
                </div>
              </div>

              {/* Drop Zone */}
              <div
                className="border-2 border-dashed border-dark-700/50 rounded-xl p-8 text-center mb-6 transition-colors hover:border-primary-500/30"
                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary-500/50') }}
                onDragLeave={e => e.currentTarget.classList.remove('border-primary-500/50')}
                onDrop={e => {
                  e.preventDefault()
                  e.currentTarget.classList.remove('border-primary-500/50')
                  const files = e.dataTransfer.files
                  Array.from(files).forEach(file => uploadMutation.mutate({ file }))
                }}
              >
                <Upload className="w-8 h-8 text-dark-500 mx-auto mb-3" />
                <p className="text-dark-400 text-sm">Drag & drop files here or click upload</p>
                <p className="text-dark-600 text-xs mt-1">PDF, Images, DXF, DWG, GeoJSON</p>
              </div>

              {/* Files Grid */}
              {docsLoading ? (
                <LoadingSpinner />
              ) : !documents?.length ? (
                <p className="text-center text-dark-500 py-8">No documents uploaded yet</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {documents.map((doc: ProjectDocument) => {
                    const Icon = getFileIcon(doc.file_type)
                    return (
                      <div key={doc.id} className="bg-dark-800/40 rounded-xl p-4 border border-dark-700/30 group hover:border-dark-600/50 transition-all">
                        <div className="flex items-start gap-3">
                          <div className="p-2.5 rounded-lg bg-dark-700/50">
                            <Icon className="w-5 h-5 text-primary-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate" title={doc.file_name}>{doc.file_name}</p>
                            <p className="text-xs text-dark-500 mt-0.5">{formatFileSize(doc.file_size_bytes)}</p>
                            <p className="text-xs text-dark-600 mt-0.5">{formatDate(doc.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-dark-700/20">
                          {(doc.file_type === 'pdf' || doc.file_type === 'image') && (
                            <button onClick={() => handlePreview(doc)}
                              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs text-dark-400 hover:text-white bg-dark-700/30 hover:bg-dark-700/50 transition-all">
                              <Eye className="w-3.5 h-3.5" /> View
                            </button>
                          )}
                          <button onClick={() => handleDownload(doc)}
                            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg text-xs text-dark-400 hover:text-white bg-dark-700/30 hover:bg-dark-700/50 transition-all">
                            <Download className="w-3.5 h-3.5" /> Download
                          </button>
                          <button onClick={() => { if (confirm('Delete this file?')) deleteMutation.mutate(doc.id) }}
                            className="flex items-center justify-center p-1.5 rounded-lg text-dark-500 hover:text-red-400 bg-dark-700/30 hover:bg-red-500/10 transition-all">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'drawing' && (
          <motion.div key="drawing" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="flex gap-6">
              {/* Main Drawing Area */}
              <div className="flex-1 glass-card p-6">
                {/* Drawing Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-display font-bold text-white">AutoCAD Drawing</h2>
                    {activeVersionId && drawingVersions && (
                      <p className="text-xs text-primary-400 mt-1 flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Viewing: {drawingVersions.find((v: DrawingVersion) => v.id === activeVersionId)?.version_name}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-wrap justify-end">
                    <input ref={dxfInputRef} type="file" accept=".dxf" className="hidden" onChange={handleDxfUpload} />
                    <button onClick={() => dxfInputRef.current?.click()} disabled={dxfUploadMutation.isPending}
                      className="btn-secondary">
                      {dxfUploadMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Import DXF
                    </button>
                    {displayEntities.length > 0 && (
                      <>
                        <button onClick={() => {
                          setVersionName('')
                          setVersionNotes('')
                          setShowSaveVersionModal(true)
                        }} className="btn-primary">
                          <Copy className="w-4 h-4" /> Save Copy
                        </button>
                        {activeVersionId && (
                          <button onClick={() => {
                            const v = drawingVersions?.find((v: DrawingVersion) => v.id === activeVersionId)
                            if (v) handleEditVersionName(v)
                          }} className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-2 hover:bg-amber-500/30 transition-all">
                            <Save className="w-4 h-4" /> Update Version
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Drawing Canvas */}
                {drawingLoading ? (
                  <LoadingSpinner />
                ) : displayEntities.length === 0 ? (
                  <div className="border-2 border-dashed border-dark-700/50 rounded-xl p-16 text-center">
                    <Pen className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                    <p className="text-dark-400 text-lg font-medium mb-2">No drawing imported</p>
                    <p className="text-dark-600 text-sm mb-4">Upload a DXF file to view and save the AutoCAD drawing</p>
                    <button onClick={() => dxfInputRef.current?.click()} className="btn-primary mx-auto">
                      <Upload className="w-4 h-4" /> Import DXF File
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl overflow-hidden border border-dark-700/30" style={{ height: '650px' }}>
                    <MapDxfViewer
                      entities={displayEntities as DxfEntity[]}
                      latitude={project?.latitude}
                      longitude={project?.longitude}
                    />
                  </div>
                )}

                {displayEntities.length > 0 && (
                  <p className="text-xs text-dark-600 mt-3">
                    {displayEntities.length} entities loaded. Toggle between Map View and Drawing View. Use mouse to pan, scroll to zoom.
                  </p>
                )}
              </div>

              {/* Version Sidebar */}
              <div className="w-80 shrink-0">
                <div className="glass-card overflow-hidden">
                  <div className="p-4 border-b border-dark-700/30">
                    <h3 className="font-display font-bold text-white flex items-center gap-2">
                      <Layers className="w-4 h-4 text-primary-400" />
                      Saved Copies
                    </h3>
                  </div>

                  <div className="max-h-[600px] overflow-y-auto p-3 space-y-2">
                    {versionsLoading ? (
                      <div className="flex justify-center py-8"><LoadingSpinner /></div>
                    ) : !drawingVersions?.length ? (
                      <div className="text-center py-8">
                        <Layers className="w-10 h-10 text-dark-600 mx-auto mb-3" />
                        <p className="text-dark-400 text-sm">No saved copies yet</p>
                        <p className="text-dark-500 text-xs mt-1">Import a DXF or save a copy</p>
                      </div>
                    ) : (
                      drawingVersions.map((version: DrawingVersion) => (
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
                                title="Edit version"
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
                                  if (confirm('Delete this saved copy?')) deleteVersionMutation.mutate(version.id)
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
                              <Pen className="w-3 h-3" />
                              {(version.dxf_entities || []).length} entities
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

                  {/* Show current drawing button */}
                  {drawingData?.entities?.length > 0 && activeVersionId && (
                    <div className="p-3 border-t border-dark-700/30">
                      <button
                        onClick={() => { setActiveVersionId(null); setViewingEntities(null) }}
                        className="w-full text-xs text-dark-400 hover:text-white py-2 rounded-lg hover:bg-dark-800/60 transition-all"
                      >
                        Show Current Import
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => { URL.revokeObjectURL(previewDoc.url); setPreviewDoc(null) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={e => e.stopPropagation()}
              className="w-full max-w-5xl max-h-[90vh] flex flex-col bg-dark-900 rounded-2xl border border-dark-700/30 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-dark-700/30">
                <h3 className="font-semibold text-white truncate">{previewDoc.name}</h3>
                <button onClick={() => { URL.revokeObjectURL(previewDoc.url); setPreviewDoc(null) }}
                  className="text-dark-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-auto p-2">
                {previewDoc.type === 'pdf' ? (
                  <iframe src={previewDoc.url} className="w-full h-full min-h-[70vh] rounded-lg" />
                ) : (
                  <img src={previewDoc.url} alt={previewDoc.name} className="max-w-full max-h-[80vh] mx-auto rounded-lg object-contain" />
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save Drawing Version Modal */}
      <AnimatePresence>
        {showSaveVersionModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
            onClick={() => setShowSaveVersionModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
              className="glass-card w-full max-w-md"
            >
              <div className="flex items-center justify-between p-6 border-b border-dark-700/30">
                <h2 className="text-lg font-display font-bold text-white flex items-center gap-2">
                  <Copy className="w-5 h-5 text-primary-400" />
                  Save Drawing Copy
                </h2>
                <button onClick={() => setShowSaveVersionModal(false)} className="text-dark-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Version Name *</label>
                  <input
                    value={versionName}
                    onChange={e => setVersionName(e.target.value)}
                    placeholder="e.g., Survey Drawing v1"
                    className="input-field"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Notes</label>
                  <textarea
                    value={versionNotes}
                    onChange={e => setVersionNotes(e.target.value)}
                    placeholder="Optional notes about this version..."
                    className="input-field h-20 resize-none"
                  />
                </div>
                <div className="bg-dark-800/40 rounded-xl p-3 border border-dark-700/20">
                  <p className="text-xs text-dark-400">
                    <span className="text-white font-medium">{displayEntities.length}</span> entities will be saved
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowSaveVersionModal(false)} className="btn-secondary flex-1">Cancel</button>
                  <button
                    onClick={handleSaveNewVersion}
                    disabled={!versionName.trim() || saveVersionMutation.isPending}
                    className="btn-primary flex-1"
                  >
                    {saveVersionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Copy'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Drawing Version Modal */}
      <AnimatePresence>
        {showEditVersionModal && editingVersion && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[2000] flex items-center justify-center p-4"
            onClick={() => setShowEditVersionModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={e => e.stopPropagation()}
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
                    onChange={e => setVersionName(e.target.value)}
                    className="input-field"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Notes</label>
                  <textarea
                    value={versionNotes}
                    onChange={e => setVersionNotes(e.target.value)}
                    className="input-field h-20 resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowEditVersionModal(false)} className="btn-secondary flex-1">Cancel</button>
                  <button
                    onClick={handleSaveEditedVersion}
                    disabled={!versionName.trim() || updateVersionMutation.isPending}
                    className="btn-primary flex-1"
                  >
                    {updateVersionMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Update'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-dark-800/30">
      <Icon className="w-4 h-4 text-primary-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-dark-500 mb-0.5">{label}</p>
        <p className="text-sm text-white">{value}</p>
      </div>
    </div>
  )
}
