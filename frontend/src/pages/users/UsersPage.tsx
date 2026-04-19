import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { UserCircle, Plus, Search, Shield, Mail, Phone, X, Loader2 } from 'lucide-react'
import { usersApi } from '@/api'
import { formatDate, getInitials } from '@/utils/formatters'
import { LoadingSpinner, EmptyState, PageTitle } from '@/components/shared/Common'
import StatusBadge from '@/components/shared/StatusBadge'
import type { User } from '@/types'
import toast from 'react-hot-toast'

export default function UsersPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const queryClient = useQueryClient()

  const { data: users, isLoading } = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: () => usersApi.list(roleFilter || undefined).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => usersApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setShowCreate(false)
      toast.success('User created')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed'),
  })

  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '', role: 'client' })

  const filtered = users?.filter((u: User) =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div className="page-container">
      <div className="page-header">
        <PageTitle title="Users" subtitle="Manage system users" />
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-11" />
        </div>
        <div className="flex gap-2">
          {['', 'admin', 'surveyor', 'client'].map((r) => (
            <button key={r} onClick={() => setRoleFilter(r)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                ${roleFilter === r ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'bg-dark-800/40 text-dark-400 border border-dark-700/30 hover:text-white'}`}
            >
              {r || 'All'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/30">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">User</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Role</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-dark-400 uppercase tracking-wider hidden md:table-cell">Phone</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-dark-400 uppercase tracking-wider hidden lg:table-cell">Joined</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-dark-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/20">
                {filtered.map((user: User) => (
                  <tr key={user.id} className="table-row">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xs font-bold text-white">
                          {getInitials(user.full_name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{user.full_name}</p>
                          <p className="text-xs text-dark-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><span className="badge-info capitalize">{user.role}</span></td>
                    <td className="px-6 py-4 text-sm text-dark-400 hidden md:table-cell">{user.phone || '—'}</td>
                    <td className="px-6 py-4 text-sm text-dark-400 hidden lg:table-cell">{formatDate(user.created_at)}</td>
                    <td className="px-6 py-4">
                      {user.is_active ? <span className="badge-success">Active</span> : <span className="badge-danger">Inactive</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} className="glass-card w-full max-w-lg">
              <div className="flex items-center justify-between p-6 border-b border-dark-700/30">
                <h2 className="text-xl font-display font-bold text-white">Create User</h2>
                <button onClick={() => setShowCreate(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Full Name *</label>
                  <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Email *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Password *</label>
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="input-field" required minLength={6} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Phone</label>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Role</label>
                    <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="input-field">
                      <option value="admin">Admin</option>
                      <option value="surveyor">Surveyor</option>
                      <option value="client">Client</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create User'}
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
