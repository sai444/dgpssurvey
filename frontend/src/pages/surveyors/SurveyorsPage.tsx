import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Compass, Plus, Search, X, Loader2, Edit2, Trash2,
  Check, Phone, Mail, Award, User
} from 'lucide-react'
import { surveyorsApi } from '@/api'
import { formatDate, getInitials } from '@/utils/formatters'
import { LoadingSpinner, EmptyState, PageTitle } from '@/components/shared/Common'
import toast from 'react-hot-toast'

interface SurveyorUser {
  full_name: string
  email: string
  phone?: string
  is_active: boolean
}

interface Surveyor {
  id: string
  user_id: string
  license_number?: string
  specialization?: string
  is_available: boolean
  created_at?: string
  user?: SurveyorUser
}

const defaultCreateForm = {
  full_name: '', email: '', password: '', phone: '',
  license_number: '', specialization: ''
}

const defaultEditForm = {
  full_name: '', phone: '',
  license_number: '', specialization: '', is_available: true
}

export default function SurveyorsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [editSurveyor, setEditSurveyor] = useState<Surveyor | null>(null)
  const [deleteSurveyor, setDeleteSurveyor] = useState<Surveyor | null>(null)
  const [search, setSearch] = useState('')
  const [createForm, setCreateForm] = useState(defaultCreateForm)
  const [editForm, setEditForm] = useState(defaultEditForm)
  const queryClient = useQueryClient()

  const { data: surveyors, isLoading } = useQuery({
    queryKey: ['surveyors'],
    queryFn: () => surveyorsApi.list().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => surveyorsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveyors'] })
      setShowCreate(false)
      setCreateForm(defaultCreateForm)
      toast.success('Surveyor added successfully')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to add surveyor'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => surveyorsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveyors'] })
      setEditSurveyor(null)
      toast.success('Surveyor updated')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => surveyorsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surveyors'] })
      setDeleteSurveyor(null)
      toast.success('Surveyor removed')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to delete'),
  })

  const openEdit = (s: Surveyor) => {
    setEditForm({
      full_name: s.user?.full_name || '',
      phone: s.user?.phone || '',
      license_number: s.license_number || '',
      specialization: s.specialization || '',
      is_available: s.is_available,
    })
    setEditSurveyor(s)
  }

  const filtered = surveyors?.filter((s: Surveyor) =>
    (s.user?.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.user?.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.license_number || '').toLowerCase().includes(search.toLowerCase()) ||
    (s.specialization || '').toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div className="page-container">
      <div className="page-header">
        <PageTitle title="Surveyors" subtitle={`${filtered.length} team members`} />
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Surveyor
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
        <input
          type="text"
          placeholder="Search by name, email, license, or specialization..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-11"
        />
      </div>

      {/* Surveyor Cards */}
      {isLoading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No surveyors found"
          description="Add your first surveyor to start managing your team"
          action={<button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Surveyor</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s: Surveyor, i: number) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card-hover p-5 group"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-sm font-bold text-white shadow-lg shadow-violet-500/20">
                    {s.user ? getInitials(s.user.full_name) : <Compass className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{s.user?.full_name || 'Unknown'}</h3>
                    <p className="text-xs text-dark-400">{s.user?.email || ''}</p>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-dark-700/50 text-dark-400 hover:text-primary-400 transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteSurveyor(s)} className="p-1.5 rounded-lg hover:bg-dark-700/50 text-dark-400 hover:text-rose-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Info */}
              <div className="space-y-2 text-sm mb-4">
                {s.user?.phone && (
                  <div className="flex items-center gap-2 text-dark-400">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{s.user.phone}</span>
                  </div>
                )}
                {s.license_number && (
                  <div className="flex items-center gap-2 text-dark-400">
                    <Award className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="font-mono text-xs">{s.license_number}</span>
                  </div>
                )}
                {s.specialization && (
                  <div className="flex items-center gap-2 text-dark-400">
                    <Compass className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{s.specialization}</span>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-dark-700/30">
                {s.is_available ? (
                  <span className="badge-success text-xs"><Check className="w-3 h-3 mr-1" /> Available</span>
                ) : (
                  <span className="badge-danger text-xs"><X className="w-3 h-3 mr-1" /> Busy</span>
                )}
                {s.created_at && (
                  <span className="text-xs text-dark-500">Since {formatDate(s.created_at)}</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-lg"
            >
              <div className="flex items-center justify-between p-6 border-b border-dark-700/30">
                <h2 className="text-xl font-display font-bold text-white">Add Surveyor</h2>
                <button onClick={() => setShowCreate(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(createForm) }} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Full Name *</label>
                  <input value={createForm.full_name} onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })} className="input-field" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Email *</label>
                    <input type="email" value={createForm.email} onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })} className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Password *</label>
                    <input type="password" value={createForm.password} onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })} className="input-field" required minLength={6} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Phone</label>
                    <input value={createForm.phone} onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })} className="input-field" placeholder="+91 98765 43210" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">License Number</label>
                    <input value={createForm.license_number} onChange={(e) => setCreateForm({ ...createForm, license_number: e.target.value })} className="input-field" placeholder="LIC-XXX" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Specialization</label>
                  <select value={createForm.specialization} onChange={(e) => setCreateForm({ ...createForm, specialization: e.target.value })} className="input-field">
                    <option value="">Select specialization</option>
                    <option value="DGPS Survey">DGPS Survey</option>
                    <option value="Total Station">Total Station</option>
                    <option value="Drone Survey">Drone Survey</option>
                    <option value="Topographic Survey">Topographic Survey</option>
                    <option value="Boundary Survey">Boundary Survey</option>
                    <option value="Construction Survey">Construction Survey</option>
                    <option value="GIS Mapping">GIS Mapping</option>
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Surveyor'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editSurveyor && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setEditSurveyor(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-lg"
            >
              <div className="flex items-center justify-between p-6 border-b border-dark-700/30">
                <h2 className="text-xl font-display font-bold text-white">Edit Surveyor</h2>
                <button onClick={() => setEditSurveyor(null)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); updateMutation.mutate({ id: editSurveyor.id, data: editForm }) }} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Full Name</label>
                  <input value={editForm.full_name} onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })} className="input-field" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Phone</label>
                    <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">License Number</label>
                    <input value={editForm.license_number} onChange={(e) => setEditForm({ ...editForm, license_number: e.target.value })} className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Specialization</label>
                  <select value={editForm.specialization} onChange={(e) => setEditForm({ ...editForm, specialization: e.target.value })} className="input-field">
                    <option value="">Select specialization</option>
                    <option value="DGPS Survey">DGPS Survey</option>
                    <option value="Total Station">Total Station</option>
                    <option value="Drone Survey">Drone Survey</option>
                    <option value="Topographic Survey">Topographic Survey</option>
                    <option value="Boundary Survey">Boundary Survey</option>
                    <option value="Construction Survey">Construction Survey</option>
                    <option value="GIS Mapping">GIS Mapping</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.is_available}
                      onChange={(e) => setEditForm({ ...editForm, is_available: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-dark-700 rounded-full peer peer-checked:bg-emerald-500/60 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full"></div>
                  </label>
                  <span className="text-sm text-dark-300">Available for assignments</span>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditSurveyor(null)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={updateMutation.isPending} className="btn-primary flex-1">
                    {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation */}
      <AnimatePresence>
        {deleteSurveyor && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setDeleteSurveyor(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="glass-card w-full max-w-sm p-6 text-center"
            >
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                <Trash2 className="w-7 h-7 text-rose-400" />
              </div>
              <h3 className="text-lg font-display font-bold text-white mb-2">Delete Surveyor</h3>
              <p className="text-sm text-dark-400 mb-6">
                Are you sure you want to remove <span className="text-white font-medium">{deleteSurveyor.user?.full_name}</span>?
                This will also delete their user account. This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button onClick={() => setDeleteSurveyor(null)} className="btn-secondary flex-1">Cancel</button>
                <button
                  onClick={() => deleteMutation.mutate(deleteSurveyor.id)}
                  disabled={deleteMutation.isPending}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30 transition-all font-medium text-sm flex items-center justify-center gap-2"
                >
                  {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
