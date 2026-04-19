import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  IndianRupee, Plus, X, Loader2, Pencil, Trash2,
  Landmark, FileCheck, Layers, Milestone, Sparkles
} from 'lucide-react'
import { priceMasterApi } from '@/api'
import { formatCurrency } from '@/utils/formatters'
import { LoadingSpinner, PageTitle } from '@/components/shared/Common'
import type { PriceTier, PaymentTerm } from '@/types'
import toast from 'react-hot-toast'

export default function PriceMasterPage() {
  const queryClient = useQueryClient()
  const [editTier, setEditTier] = useState<PriceTier | null>(null)
  const [editTerm, setEditTerm] = useState<PaymentTerm | null>(null)
  const [showAddTerm, setShowAddTerm] = useState(false)

  const { data: tiers, isLoading: tiersLoading } = useQuery({
    queryKey: ['price-tiers'],
    queryFn: () => priceMasterApi.listTiers().then(r => r.data),
  })
  const { data: terms, isLoading: termsLoading } = useQuery({
    queryKey: ['payment-terms'],
    queryFn: () => priceMasterApi.listTerms().then(r => r.data),
  })

  const seedMutation = useMutation({
    mutationFn: () => priceMasterApi.seedDefaults(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-tiers'] })
      queryClient.invalidateQueries({ queryKey: ['payment-terms'] })
      toast.success('Default pricing and terms loaded')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed'),
  })

  const updateTierMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => priceMasterApi.updateTier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-tiers'] })
      setEditTier(null)
      toast.success('Price updated')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed'),
  })

  const deleteTierMutation = useMutation({
    mutationFn: (id: string) => priceMasterApi.deleteTier(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['price-tiers'] })
      toast.success('Price tier removed')
    },
  })

  const createTermMutation = useMutation({
    mutationFn: (data: any) => priceMasterApi.createTerm(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-terms'] })
      setShowAddTerm(false)
      toast.success('Payment term added')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed'),
  })

  const updateTermMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => priceMasterApi.updateTerm(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-terms'] })
      setEditTerm(null)
      toast.success('Payment term updated')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed'),
  })

  const deleteTermMutation = useMutation({
    mutationFn: (id: string) => priceMasterApi.deleteTerm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-terms'] })
      toast.success('Payment term removed')
    },
  })

  const surveyTiers = (tiers || []).filter((t: PriceTier) => t.category === 'survey')
  const layoutTiers = (tiers || []).filter((t: PriceTier) => t.category === 'layout')
  const isEmpty = !tiers?.length && !terms?.length

  // --- Edit Tier Form ---
  const [tierPrice, setTierPrice] = useState('')
  useEffect(() => {
    if (editTier) setTierPrice(String(editTier.price_per_acre))
  }, [editTier])

  // --- Add Term Form ---
  const [termForm, setTermForm] = useState({ name: 'Standard', milestone_percent: '', milestone_label: '', sort_order: '0' })
  const [editTermForm, setEditTermForm] = useState({ milestone_percent: '', milestone_label: '' })
  useEffect(() => {
    if (editTerm) {
      setEditTermForm({
        milestone_percent: String(editTerm.milestone_percent),
        milestone_label: editTerm.milestone_label,
      })
    }
  }, [editTerm])

  if (tiersLoading || termsLoading) return <LoadingSpinner />

  return (
    <div className="page-container">
      <div className="page-header">
        <PageTitle title="Price Master" subtitle="Manage survey pricing & payment terms" />
        {isEmpty && (
          <button onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending} className="btn-primary">
            {seedMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Load Defaults</>}
          </button>
        )}
      </div>

      {/* ─── SURVEY PRICING ──────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Landmark className="w-4 h-4 text-blue-400" />
          </div>
          <h2 className="text-lg font-display font-bold text-white">Survey Pricing</h2>
          <span className="text-xs text-dark-500 ml-2">Per acre rates based on land area</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {surveyTiers.map((tier: PriceTier, i: number) => (
            <motion.div key={tier.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card-hover p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-sm font-medium text-dark-300">{tier.label}</p>
                  <p className="text-xs text-dark-500 mt-0.5">
                    {tier.min_acres != null && tier.max_acres != null
                      ? `${tier.min_acres} – ${tier.max_acres} acres`
                      : tier.min_acres != null
                        ? `> ${tier.min_acres} acres`
                        : ''}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditTier(tier)} className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-dark-800/50 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">{formatCurrency(tier.price_per_acre)}</span>
                <span className="text-xs text-dark-500">/acre</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ─── LAYOUT PRICING ──────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <Layers className="w-4 h-4 text-purple-400" />
          </div>
          <h2 className="text-lg font-display font-bold text-white">Layout Pricing</h2>
          <span className="text-xs text-dark-500 ml-2">Per acre rates based on approval status</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {layoutTiers.map((tier: PriceTier, i: number) => (
            <motion.div key={tier.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card-hover p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${tier.condition === 'approved' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <p className="text-sm font-medium text-dark-300">{tier.label}</p>
                </div>
                <button onClick={() => setEditTier(tier)} className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-dark-800/50 transition-colors">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-white">{formatCurrency(tier.price_per_acre)}</span>
                <span className="text-xs text-dark-500">/acre</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* ─── PAYMENT TERMS ──────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Milestone className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-lg font-display font-bold text-white">Payment Terms</h2>
            <span className="text-xs text-dark-500 ml-2">Milestone-based payment schedule</span>
          </div>
          <button onClick={() => { setTermForm({ name: 'Standard', milestone_percent: '', milestone_label: '', sort_order: String((terms?.length || 0) + 1) }); setShowAddTerm(true) }}
            className="text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add Term
          </button>
        </div>

        {terms?.length ? (
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700/30">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Order</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">Milestone</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider">%</th>
                  <th className="text-right px-6 py-3 text-xs font-semibold text-dark-400 uppercase tracking-wider w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700/20">
                {terms.map((term: PaymentTerm, i: number) => (
                  <tr key={term.id} className="table-row">
                    <td className="px-6 py-3">
                      <span className="w-7 h-7 rounded-full bg-dark-800 border border-dark-700/50 inline-flex items-center justify-center text-xs font-bold text-dark-300">
                        {term.sort_order || i + 1}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-dark-200">{term.milestone_label}</td>
                    <td className="px-6 py-3 text-right">
                      <span className="text-sm font-bold text-white">{term.milestone_percent}%</span>
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditTerm(term)} className="p-1.5 rounded-lg text-dark-400 hover:text-primary-400 hover:bg-dark-800/50 transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => deleteTermMutation.mutate(term.id)} className="p-1.5 rounded-lg text-dark-400 hover:text-rose-400 hover:bg-dark-800/50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-dark-700/30">
                  <td className="px-6 py-3" />
                  <td className="px-6 py-3 text-sm font-semibold text-dark-300">Total</td>
                  <td className="px-6 py-3 text-right">
                    <span className={`text-sm font-bold ${(terms.reduce((s: number, t: PaymentTerm) => s + t.milestone_percent, 0)) === 100 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {terms.reduce((s: number, t: PaymentTerm) => s + t.milestone_percent, 0)}%
                    </span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <p className="text-dark-400 text-sm">No payment terms configured</p>
          </div>
        )}

        {/* Payment terms preview */}
        {terms?.length > 0 && (
          <div className="glass-card p-5 mt-4">
            <h3 className="text-sm font-semibold text-dark-300 mb-3">Terms Preview (as shown on invoice)</h3>
            <div className="p-4 rounded-lg bg-dark-800/40 border border-dark-700/30 text-sm text-dark-400 space-y-2">
              <p className="font-medium text-dark-300 mb-2">Payment Terms & Conditions:</p>
              {terms.map((term: PaymentTerm, i: number) => (
                <div key={term.id} className="flex items-start gap-2">
                  <span className="text-dark-500 font-mono text-xs mt-0.5">{i + 1}.</span>
                  <span>{term.milestone_percent}% — {term.milestone_label}</span>
                </div>
              ))}
              <div className="border-t border-dark-700/30 pt-2 mt-3 space-y-1 text-xs text-dark-500">
                <p>• All payments to be made via bank transfer/UPI/cheque</p>
                <p>• Work will commence upon receipt of advance payment</p>
                <p>• Prices are exclusive of applicable taxes (GST @ 18%)</p>
                <p>• Quotation valid for 30 days from date of issue</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── EDIT TIER MODAL ──────────────────────────────────── */}
      <AnimatePresence>
        {editTier && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditTier(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} className="glass-card w-full max-w-sm">
              <div className="flex items-center justify-between p-6 border-b border-dark-700/30">
                <h2 className="text-lg font-display font-bold text-white">Edit Price</h2>
                <button onClick={() => setEditTier(null)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm text-dark-400 mb-1">{editTier.label}</p>
                  <p className="text-xs text-dark-500">
                    {editTier.category === 'survey'
                      ? `${editTier.min_acres ?? 0}${editTier.max_acres ? ` – ${editTier.max_acres}` : '+'} acres`
                      : editTier.condition === 'approved' ? 'Approved Layouts' : 'Unapproved Layouts'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Price per Acre (₹)</label>
                  <input type="number" step="100" min="0" value={tierPrice}
                    onChange={(e) => setTierPrice(e.target.value)} className="input-field" />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setEditTier(null)} className="btn-secondary flex-1">Cancel</button>
                  <button
                    disabled={updateTierMutation.isPending}
                    onClick={() => updateTierMutation.mutate({ id: editTier.id, data: { price_per_acre: parseFloat(tierPrice) } })}
                    className="btn-primary flex-1"
                  >
                    {updateTierMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── ADD TERM MODAL ──────────────────────────────────── */}
      <AnimatePresence>
        {showAddTerm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowAddTerm(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} className="glass-card w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-dark-700/30">
                <h2 className="text-lg font-display font-bold text-white">Add Payment Term</h2>
                <button onClick={() => setShowAddTerm(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); createTermMutation.mutate({ name: termForm.name, milestone_percent: parseFloat(termForm.milestone_percent), milestone_label: termForm.milestone_label, sort_order: parseInt(termForm.sort_order) }) }}
                className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Milestone Description *</label>
                  <input type="text" value={termForm.milestone_label}
                    onChange={(e) => setTermForm({ ...termForm, milestone_label: e.target.value })} className="input-field" required
                    placeholder="e.g. On completion of field survey" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Percentage *</label>
                    <input type="number" step="1" min="1" max="100" value={termForm.milestone_percent}
                      onChange={(e) => setTermForm({ ...termForm, milestone_percent: e.target.value })} className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Order</label>
                    <input type="number" step="1" min="1" value={termForm.sort_order}
                      onChange={(e) => setTermForm({ ...termForm, sort_order: e.target.value })} className="input-field" />
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddTerm(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={createTermMutation.isPending} className="btn-primary flex-1">
                    {createTermMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Term'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── EDIT TERM MODAL ──────────────────────────────────── */}
      <AnimatePresence>
        {editTerm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditTerm(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} className="glass-card w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-dark-700/30">
                <h2 className="text-lg font-display font-bold text-white">Edit Payment Term</h2>
                <button onClick={() => setEditTerm(null)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); updateTermMutation.mutate({ id: editTerm.id, data: { milestone_percent: parseFloat(editTermForm.milestone_percent), milestone_label: editTermForm.milestone_label } }) }}
                className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Milestone Description *</label>
                  <input type="text" value={editTermForm.milestone_label}
                    onChange={(e) => setEditTermForm({ ...editTermForm, milestone_label: e.target.value })} className="input-field" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Percentage *</label>
                  <input type="number" step="1" min="1" max="100" value={editTermForm.milestone_percent}
                    onChange={(e) => setEditTermForm({ ...editTermForm, milestone_percent: e.target.value })} className="input-field" required />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setEditTerm(null)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={updateTermMutation.isPending} className="btn-primary flex-1">
                    {updateTermMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
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
