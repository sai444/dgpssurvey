import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TicketCheck, Plus, Search, X, Loader2, MessageSquare,
  AlertTriangle, Clock
} from 'lucide-react'
import { ticketsApi, projectsApi, surveyorsApi } from '@/api'
import { formatDateTime } from '@/utils/formatters'
import { LoadingSpinner, EmptyState, PageTitle } from '@/components/shared/Common'
import StatusBadge from '@/components/shared/StatusBadge'
import type { Ticket } from '@/types'
import toast from 'react-hot-toast'

export default function TicketsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const queryClient = useQueryClient()

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets', statusFilter],
    queryFn: () => ticketsApi.list(statusFilter || undefined).then((r) => r.data),
  })
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.list().then((r) => r.data) })
  const { data: surveyors } = useQuery({ queryKey: ['surveyors'], queryFn: () => surveyorsApi.list().then((r) => r.data) })

  const [form, setForm] = useState({ project_id: '', subject: '', description: '', priority: 'medium', category: 'general', assigned_to: '' })

  const createMutation = useMutation({
    mutationFn: (data: any) => ticketsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      setShowCreate(false)
      toast.success('Ticket created')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed'),
  })

  const filtered = tickets?.filter((t: Ticket) =>
    t.subject.toLowerCase().includes(search.toLowerCase()) ||
    t.ticket_number.toLowerCase().includes(search.toLowerCase())
  ) || []

  const statuses = ['', 'open', 'in_progress', 'resolved', 'closed']

  const priorityIcons: Record<string, string> = {
    low: '🟢', medium: '🟡', high: '🟠', urgent: '🔴'
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <PageTitle title="Support Tickets" subtitle={`${filtered.length} tickets`} />
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus className="w-4 h-4" /> New Ticket
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input type="text" placeholder="Search tickets..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-11" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {statuses.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all
                ${statusFilter === s ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                  : 'bg-dark-800/40 text-dark-400 border border-dark-700/30 hover:text-white'}`}>
              {s ? s.replace(/_/g, ' ') : 'All'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={TicketCheck} title="No tickets" description="Create a ticket for support"
          action={<button onClick={() => setShowCreate(true)} className="btn-primary"><Plus className="w-4 h-4" /> New Ticket</button>} />
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket: Ticket, i: number) => (
            <motion.div key={ticket.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              className="glass-card-hover p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center border border-rose-500/20 flex-shrink-0">
                    <TicketCheck className="w-5 h-5 text-rose-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-mono text-dark-500">{ticket.ticket_number}</span>
                      <StatusBadge status={ticket.status} />
                      <StatusBadge status={ticket.priority} />
                    </div>
                    <h3 className="font-medium text-white">{ticket.subject}</h3>
                    {ticket.description && <p className="text-sm text-dark-400 mt-1 line-clamp-1">{ticket.description}</p>}
                  </div>
                </div>

                <div className="flex items-center gap-3 text-xs text-dark-500 sm:flex-col sm:items-end">
                  <span className="badge-default capitalize">{ticket.category.replace(/_/g, ' ')}</span>
                  {ticket.assigned_to && (() => {
                    const s = surveyors?.find((sv: any) => sv.user_id === ticket.assigned_to)
                    return s ? (
                      <span className="flex items-center gap-1 text-primary-400">
                        <span className="w-4 h-4 rounded-full bg-primary-500/20 flex items-center justify-center text-[10px] font-bold">{(s.user?.full_name || 'S')[0]}</span>
                        {s.user?.full_name || 'Surveyor'}
                      </span>
                    ) : null
                  })()}
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDateTime(ticket.created_at)}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} className="glass-card w-full max-w-lg">
              <div className="flex items-center justify-between p-6 border-b border-dark-700/30">
                <h2 className="text-xl font-display font-bold text-white">Create Ticket</h2>
                <button onClick={() => setShowCreate(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate({ ...form, assigned_to: form.assigned_to || undefined }) }} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Project *</label>
                  <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className="input-field" required>
                    <option value="">Select project</option>
                    {projects?.map((p: any) => <option key={p.id} value={p.id}>{p.project_number} - {p.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Subject *</label>
                  <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="input-field h-24 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Assign to Surveyor</label>
                  <select value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} className="input-field">
                    <option value="">Unassigned</option>
                    {surveyors?.map((s: any) => <option key={s.id} value={s.user_id}>{s.user?.full_name || 'Surveyor'}{s.specialization ? ` (${s.specialization})` : ''}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Priority</label>
                    <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="input-field">
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Category</label>
                    <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="input-field">
                      <option value="general">General</option>
                      <option value="re_survey">Re-Survey</option>
                      <option value="correction">Correction</option>
                      <option value="dispute">Dispute</option>
                      <option value="billing">Billing</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                    {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Ticket'}
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
