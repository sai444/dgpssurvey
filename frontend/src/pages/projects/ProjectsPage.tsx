import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FolderKanban, Plus, Search, Filter, MapPin, Calendar,
  ChevronRight, X, Loader2, Map
} from 'lucide-react'
import { projectsApi, clientsApi } from '@/api'
import { formatDate } from '@/utils/formatters'
import { LoadingSpinner, EmptyState, PageTitle } from '@/components/shared/Common'
import StatusBadge from '@/components/shared/StatusBadge'
import type { Project } from '@/types'
import toast from 'react-hot-toast'

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [statusFilter, setStatusFilter] = useState('')
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects', statusFilter],
    queryFn: () => projectsApi.list(statusFilter || undefined).then((r) => r.data),
  })

  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => projectsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setShowCreate(false)
      toast.success('Project created successfully')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to create project'),
  })

  const [form, setForm] = useState({
    title: '', description: '', client_id: '', priority: 'medium',
    location: '', latitude: '', longitude: '', area_sqm: '',
    start_date: '', end_date: ''
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate({
      ...form,
      client_id: form.client_id || undefined,
      latitude: form.latitude ? parseFloat(form.latitude) : undefined,
      longitude: form.longitude ? parseFloat(form.longitude) : undefined,
      area_sqm: form.area_sqm ? parseFloat(form.area_sqm) : undefined,
      start_date: form.start_date || undefined,
      end_date: form.end_date || undefined,
    })
  }

  const filtered = projects?.filter((p: Project) =>
    p.title.toLowerCase().includes(search.toLowerCase()) ||
    p.project_number.toLowerCase().includes(search.toLowerCase())
  ) || []

  const statuses = ['', 'draft', 'in_progress', 'completed', 'on_hold', 'cancelled']

  return (
    <div className="page-container">
      <div className="page-header">
        <PageTitle title="Projects" subtitle={`${filtered.length} projects found`} />
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-11"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                ${statusFilter === s
                  ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'bg-dark-800/40 text-dark-400 border border-dark-700/30 hover:text-white'}`}
            >
              {s ? s.replace(/_/g, ' ') : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Project Cards */}
      {isLoading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects found"
          description="Create your first project to start managing surveys"
          action={<button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> Create Project</button>}
        />
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
        >
          {filtered.map((project: Project, i: number) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card-hover p-5 group cursor-pointer"
              onClick={() => navigate(`/projects/${project.id}`)}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-mono text-dark-500 mb-1">{project.project_number}</p>
                  <h3 className="font-semibold text-white group-hover:text-primary-300 transition-colors line-clamp-1">
                    {project.title}
                  </h3>
                </div>
                <ChevronRight className="w-5 h-5 text-dark-600 group-hover:text-primary-400 transition-all group-hover:translate-x-1" />
              </div>

              {project.description && (
                <p className="text-sm text-dark-400 line-clamp-2 mb-4">{project.description}</p>
              )}

              <div className="flex items-center gap-2 mb-4">
                <StatusBadge status={project.status} />
                <StatusBadge status={project.priority} />
              </div>

              <div className="flex items-center justify-between text-xs text-dark-500">
                {project.location && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-[120px]">{project.location}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project.id}/map`) }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 transition-all"
                    title="Open Survey Map"
                  >
                    <Map className="w-3 h-3" />
                    <span>Map</span>
                  </button>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(project.created_at)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between p-6 border-b border-dark-700/30">
                <h2 className="text-xl font-display font-bold text-white">Create Project</h2>
                <button onClick={() => setShowCreate(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Title *</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field h-24 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Client</label>
                    <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="input-field">
                      <option value="">Select client</option>
                      {clients?.map((c: any) => <option key={c.id} value={c.id}>{c.company_name || c.email}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Priority</label>
                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-field">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Location</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="input-field" placeholder="Survey location" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Latitude</label>
                    <input type="number" step="any" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Longitude</label>
                    <input type="number" step="any" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Area (sqm)</label>
                    <input type="number" step="any" value={form.area_sqm} onChange={(e) => setForm({ ...form, area_sqm: e.target.value })} className="input-field" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Start Date</label>
                    <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">End Date</label>
                    <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className="input-field" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Project'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
