import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Plus, Search, Building2, Mail, Phone, MapPin, X, Loader2 } from 'lucide-react'
import { clientsApi } from '@/api'
import { formatDate } from '@/utils/formatters'
import { LoadingSpinner, EmptyState, PageTitle } from '@/components/shared/Common'
import type { Client } from '@/types'
import toast from 'react-hot-toast'

export default function ClientsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const queryClient = useQueryClient()

  const { data: clients, isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientsApi.list().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setShowCreate(false)
      toast.success('Client added successfully')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to add client'),
  })

  const [form, setForm] = useState({
    company_name: '', contact_person: '', email: '', phone: '', address: '', gst_number: ''
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    createMutation.mutate(form)
  }

  const filtered = clients?.filter((c: Client) =>
    (c.company_name || '').toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact_person || '').toLowerCase().includes(search.toLowerCase())
  ) || []

  return (
    <div className="page-container">
      <div className="page-header">
        <PageTitle title="Clients" subtitle={`${filtered.length} clients registered`} />
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
        <input
          type="text"
          placeholder="Search clients by name, email, or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-11"
        />
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients found"
          description="Add your first client to start managing projects"
          action={<button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> Add Client</button>}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((client: Client, i: number) => (
            <motion.div
              key={client.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="glass-card-hover p-5"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-sky-500/20 to-sky-600/20 flex items-center justify-center border border-sky-500/20">
                  <Building2 className="w-6 h-6 text-sky-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{client.company_name || 'Individual'}</h3>
                  {client.contact_person && <p className="text-sm text-dark-400">{client.contact_person}</p>}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-dark-400">
                  <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{client.email}</span>
                </div>
                {client.phone && (
                  <div className="flex items-center gap-2 text-dark-400">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.address && (
                  <div className="flex items-center gap-2 text-dark-400">
                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">{client.address}</span>
                  </div>
                )}
              </div>

              {client.gst_number && (
                <div className="mt-3 pt-3 border-t border-dark-700/30">
                  <span className="text-xs text-dark-500">GST: </span>
                  <span className="text-xs font-mono text-dark-300">{client.gst_number}</span>
                </div>
              )}
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
                <h2 className="text-xl font-display font-bold text-white">Add Client</h2>
                <button onClick={() => setShowCreate(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Company Name</label>
                    <input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Contact Person</label>
                    <input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Email *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input-field" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Phone</label>
                    <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">GST Number</label>
                    <input value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value })} className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Address</label>
                  <textarea value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="input-field h-20 resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Client'}
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
