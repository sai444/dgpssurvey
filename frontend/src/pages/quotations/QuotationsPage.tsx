import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText, Plus, Search, X, Loader2, IndianRupee,
  Calendar, Send, Check, XCircle, Zap, Printer, Eye, Edit3
} from 'lucide-react'
import { quotationsApi, projectsApi, clientsApi, priceMasterApi } from '@/api'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { LoadingSpinner, EmptyState, PageTitle } from '@/components/shared/Common'
import StatusBadge from '@/components/shared/StatusBadge'
import PrintDocument from '@/components/shared/PrintDocument'
import type { Quotation, PriceTier, PaymentTerm, Project, Client } from '@/types'
import toast from 'react-hot-toast'

export default function QuotationsPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null)
  const [search, setSearch] = useState('')
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const queryClient = useQueryClient()

  const { data: quotations, isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => quotationsApi.list().then((r) => r.data),
  })
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.list().then((r) => r.data) })
  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: () => clientsApi.list().then((r) => r.data) })
  const { data: priceTiers } = useQuery({ queryKey: ['price-tiers'], queryFn: () => priceMasterApi.listTiers().then(r => r.data) })
  const { data: paymentTerms } = useQuery({ queryKey: ['payment-terms'], queryFn: () => priceMasterApi.listTerms().then(r => r.data) })

  const emptyForm = {
    project_id: '', client_id: '', tax_percent: '18', discount: '0', notes: '', terms_conditions: '', valid_until: '',
    items: [{ description: '', quantity: '1', unit: 'sq.ft', unit_price: '0' }]
  }
  const [form, setForm] = useState(emptyForm)

  // Build default terms from payment terms
  const getDefaultTerms = () => {
    if (!paymentTerms?.length) return ''
    const sorted = [...paymentTerms].sort((a: PaymentTerm, b: PaymentTerm) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const lines = sorted.map((t: PaymentTerm, i: number) =>
      `${i + 1}. ${t.milestone_label} — ${t.milestone_percent}%${t.description ? ` (${t.description})` : ''}`
    )
    return `Payment Terms:\n${lines.join('\n')}`
  }

  const createMutation = useMutation({
    mutationFn: (data: any) => quotationsApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      setShowCreate(false)
      setForm(emptyForm)
      toast.success('Quotation created')
      if (response.data) {
        setSelectedQuotation(response.data)
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => quotationsApi.update(id, data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      setShowCreate(false)
      setEditingQuotation(null)
      setForm(emptyForm)
      toast.success('Quotation updated')
      if (response.data) {
        setSelectedQuotation(response.data)
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update'),
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const payload = {
      project_id: form.project_id,
      client_id: form.client_id,
      tax_percent: parseFloat(form.tax_percent),
      discount: parseFloat(form.discount),
      notes: form.notes || undefined,
      terms_conditions: form.terms_conditions || undefined,
      valid_until: form.valid_until || undefined,
      items: form.items.map((item) => ({
        description: item.description,
        quantity: parseFloat(item.quantity),
        unit: item.unit,
        unit_price: parseFloat(item.unit_price),
      })),
    }
    if (editingQuotation) {
      updateMutation.mutate({ id: editingQuotation.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const openCreateForm = () => {
    const defaultTerms = getDefaultTerms()
    setEditingQuotation(null)
    setForm({ ...emptyForm, terms_conditions: defaultTerms })
    setShowCreate(true)
  }

  const openEditForm = (q: Quotation) => {
    setEditingQuotation(q)
    setForm({
      project_id: q.project_id || '',
      client_id: q.client_id || '',
      tax_percent: String(q.tax_percent ?? 18),
      discount: String(q.discount ?? 0),
      notes: q.notes || '',
      terms_conditions: q.terms_conditions || '',
      valid_until: q.valid_until || '',
      items: q.items.map((item) => ({
        description: item.description || '',
        quantity: String(item.quantity ?? 1),
        unit: item.unit || 'sq.ft',
        unit_price: String(item.unit_price ?? 0),
      })),
    })
    setSelectedQuotation(null)
    setShowCreate(true)
  }

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { description: '', quantity: '1', unit: 'sq.ft', unit_price: '0' }] })
  }

  const removeItem = (index: number) => {
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) })
  }

  const updateItem = (index: number, field: string, value: string) => {
    const items = [...form.items]
    items[index] = { ...items[index], [field]: value }
    setForm({ ...form, items })
  }

  const filtered = quotations?.filter((q: Quotation) =>
    q.quotation_number.toLowerCase().includes(search.toLowerCase())
  ) || []

  const getClientInfo = (id?: string) => clients?.find((c: Client) => c.id === id)
  const getProjectInfo = (id?: string) => projects?.find((p: Project) => p.id === id)

  const handlePrint = () => {
    window.print()
  }

  const applyPricing = (type: 'survey' | 'layout', condition?: string) => {
    if (!priceTiers?.length) { toast.error('No pricing configured. Go to Price Master to set up.'); return }

    const selectedProject = projects?.find((p: Project) => p.id === form.project_id)
    const areaAcres = selectedProject?.area_sqm ? selectedProject.area_sqm / 4046.86 : 0

    if (type === 'survey') {
      const surveyTiers = priceTiers.filter((t: PriceTier) => t.category === 'survey')
      const tier = surveyTiers.find((t: PriceTier) => {
        const min = t.min_acres ?? 0
        const max = t.max_acres ?? Infinity
        return areaAcres >= min && areaAcres < max
      })
      if (!tier) { toast.error('No matching survey tier for this area'); return }
      const qty = areaAcres > 0 ? Math.round(areaAcres * 100) / 100 : 1
      setForm({
        ...form,
        items: [{
          description: `DGPS Survey — ${tier.label}`,
          quantity: String(qty),
          unit: 'acre',
          unit_price: String(tier.price_per_acre),
        }],
      })
      toast.success(`Applied: ${tier.label} @ ${formatCurrency(tier.price_per_acre)}/acre`)
    } else {
      const tier = priceTiers.find((t: PriceTier) => t.category === 'layout' && t.condition === condition)
      if (!tier) { toast.error('Layout pricing not found'); return }
      const qty = areaAcres > 0 ? Math.round(areaAcres * 100) / 100 : 1
      setForm({
        ...form,
        items: [{
          description: `Layout Survey — ${tier.label}`,
          quantity: String(qty),
          unit: 'acre',
          unit_price: String(tier.price_per_acre),
        }],
      })
      toast.success(`Applied: ${tier.label} @ ${formatCurrency(tier.price_per_acre)}/acre`)
    }
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <PageTitle title="Quotations" subtitle={`${filtered.length} quotations`} />
        <button onClick={openCreateForm} className="btn-primary">
          <Plus className="w-4 h-4" /> New Quotation
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
        <input type="text" placeholder="Search quotations..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-11" />
      </div>

      {isLoading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No quotations" description="Create your first quotation"
          action={<button onClick={openCreateForm} className="btn-primary"><Plus className="w-4 h-4" /> New Quotation</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((q: Quotation, i: number) => (
            <motion.div key={q.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="glass-card-hover p-5 cursor-pointer" onClick={() => setSelectedQuotation(q)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs font-mono text-dark-500">{q.quotation_number}</p>
                  <StatusBadge status={q.status} className="mt-1" />
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-white">{formatCurrency(q.total_amount)}</p>
                  <p className="text-xs text-dark-500">Total amount</p>
                </div>
              </div>

              <div className="space-y-2 text-sm text-dark-400 mt-4">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="text-dark-300">{formatCurrency(q.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({q.tax_percent}%)</span>
                  <span className="text-dark-300">{formatCurrency(q.tax_amount)}</span>
                </div>
                {(q.discount ?? 0) > 0 && (
                  <div className="flex justify-between">
                    <span>Discount</span>
                    <span className="text-emerald-400">-{formatCurrency(q.discount)}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-dark-700/30 text-xs text-dark-500">
                <span>{q.items.length} items</span>
                {q.valid_until && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    Valid until {formatDate(q.valid_until)}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowCreate(false); setEditingQuotation(null) }}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-dark-700/30">
                <h2 className="text-xl font-display font-bold text-white">{editingQuotation ? 'Edit Quotation' : 'Create Quotation'}</h2>
                <button onClick={() => { setShowCreate(false); setEditingQuotation(null) }} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Project *</label>
                    <select value={form.project_id} onChange={(e) => setForm({ ...form, project_id: e.target.value })} className="input-field" required>
                      <option value="">Select project</option>
                      {projects?.map((p: any) => <option key={p.id} value={p.id}>{p.project_number} - {p.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Client *</label>
                    <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className="input-field" required>
                      <option value="">Select client</option>
                      {clients?.map((c: any) => <option key={c.id} value={c.id}>{c.company_name || c.email}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Tax %</label>
                    <input type="number" step="0.01" value={form.tax_percent} onChange={(e) => setForm({ ...form, tax_percent: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Discount (₹)</label>
                    <input type="number" step="0.01" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} className="input-field" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Valid Until</label>
                    <input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} className="input-field" />
                  </div>
                </div>

                {/* Quick Apply Pricing */}
                {priceTiers?.length > 0 && (
                  <div className="p-4 rounded-lg bg-dark-800/40 border border-dark-700/30">
                    <div className="flex items-center gap-2 mb-3">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-medium text-dark-300">Quick Apply Pricing</span>
                      {form.project_id && (() => {
                        const proj = projects?.find((p: any) => p.id === form.project_id)
                        const acres = proj?.area_sqm ? (proj.area_sqm / 4046.86).toFixed(2) : null
                        return acres ? <span className="text-xs text-dark-500 ml-2">({acres} acres)</span> : null
                      })()}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => applyPricing('survey')}
                        className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-xs font-medium transition-colors">
                        Survey Pricing
                      </button>
                      <button type="button" onClick={() => applyPricing('layout', 'approved')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-medium transition-colors">
                        Layout Approved
                      </button>
                      <button type="button" onClick={() => applyPricing('layout', 'unapproved')}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-xs font-medium transition-colors">
                        Layout Unapproved
                      </button>
                    </div>
                    {!form.project_id && <p className="text-xs text-dark-500 mt-2">Select a project first for area-based auto-calculation</p>}
                  </div>
                )}

                {/* Line Items */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-sm font-medium text-dark-300">Line Items</label>
                    <button type="button" onClick={addItem} className="text-sm text-primary-400 hover:text-primary-300">+ Add Item</button>
                  </div>
                  <div className="space-y-3">
                    {form.items.map((item, index) => {
                      const itemAmount = (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)
                      return (
                        <div key={index} className="p-3 rounded-lg bg-dark-800/40 border border-dark-700/30 space-y-2">
                          <div className="flex gap-2 items-start">
                            <input placeholder="Description" value={item.description} onChange={(e) => updateItem(index, 'description', e.target.value)}
                              className="input-field flex-1 text-sm py-2" required />
                            {form.items.length > 1 && (
                              <button type="button" onClick={() => removeItem(index)} className="text-dark-400 hover:text-rose-400 p-2">
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <div className="flex gap-2 items-center">
                            <input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                              className="input-field w-24 text-sm py-2" min="0" step="0.01" required />
                            <select value={item.unit} onChange={(e) => updateItem(index, 'unit', e.target.value)} className="input-field w-32 text-sm py-2">
                              <option value="sq.ft">Sq. Feet</option>
                              <option value="sq.m">Sq. Meter</option>
                              <option value="acre">Acre</option>
                              <option value="hectare">Hectare</option>
                              <option value="r.ft">Running Ft</option>
                              <option value="nos">Nos</option>
                              <option value="hour">Hour</option>
                              <option value="day">Day</option>
                              <option value="lump sum">Lump Sum</option>
                            </select>
                            <input type="number" placeholder="Unit Price" value={item.unit_price} onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                              className="input-field w-32 text-sm py-2" min="0" step="0.01" required />
                            <div className="text-sm text-dark-300 w-28 text-right font-medium">
                              = {formatCurrency(itemAmount)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field h-20 resize-none" />
                </div>

                {/* Terms & Conditions */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-dark-300">Terms & Conditions</label>
                    <button type="button" onClick={() => {
                      const terms = getDefaultTerms()
                      if (!terms) { toast.error('No payment terms configured. Go to Price Master to set up.'); return }
                      setForm({ ...form, terms_conditions: terms })
                      toast.success('Default T&C applied')
                    }} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                      <FileText className="w-3 h-3" /> Auto-fill from Payment Terms
                    </button>
                  </div>
                  <textarea value={form.terms_conditions} onChange={(e) => setForm({ ...form, terms_conditions: e.target.value })}
                    className="input-field h-28 resize-none font-mono text-xs" placeholder="Payment terms and conditions..." />
                </div>

                {/* Live Total Preview */}
                {(() => {
                  const subtotal = form.items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0), 0)
                  const taxAmt = subtotal * ((parseFloat(form.tax_percent) || 0) / 100)
                  const discountAmt = parseFloat(form.discount) || 0
                  const total = subtotal + taxAmt - discountAmt
                  return (
                    <div className="p-4 rounded-lg bg-dark-800/60 border border-dark-700/30 space-y-2 text-sm">
                      <div className="flex justify-between text-dark-400">
                        <span>Subtotal</span><span className="text-dark-300">{formatCurrency(subtotal)}</span>
                      </div>
                      <div className="flex justify-between text-dark-400">
                        <span>Tax ({form.tax_percent}%)</span><span className="text-dark-300">{formatCurrency(taxAmt)}</span>
                      </div>
                      {discountAmt > 0 && (
                        <div className="flex justify-between text-dark-400">
                          <span>Discount</span><span className="text-emerald-400">-{formatCurrency(discountAmt)}</span>
                        </div>
                      )}
                      <div className="flex justify-between pt-2 border-t border-dark-700/30 font-bold text-white">
                        <span>Total</span><span>{formatCurrency(total)}</span>
                      </div>
                    </div>
                  )
                })()}

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => { setShowCreate(false); setEditingQuotation(null) }} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="btn-primary flex-1">
                    {(createMutation.isPending || updateMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : editingQuotation ? 'Update Quotation' : 'Create Quotation'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ DETAIL / PRINT MODAL ============ */}
      <AnimatePresence>
        {selectedQuotation && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="print-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedQuotation(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="print-content-wrapper bg-dark-900 rounded-2xl border border-dark-700/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              {/* Modal Header - hidden when printing */}
              <div className="no-print flex items-center justify-between p-4 border-b border-dark-700/30">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-display font-bold text-white">{selectedQuotation.quotation_number}</h2>
                  <StatusBadge status={selectedQuotation.status} />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEditForm(selectedQuotation)}
                    className="px-4 py-2 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 text-sm font-medium transition-colors flex items-center gap-2">
                    <Edit3 className="w-4 h-4" /> Edit
                  </button>
                  <button onClick={handlePrint}
                    className="px-4 py-2 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 text-sm font-medium transition-colors flex items-center gap-2">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <button onClick={() => setSelectedQuotation(null)} className="text-dark-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              {/* Printable Document */}
              <div className="p-4">
                {(() => {
                  const client = getClientInfo(selectedQuotation.client_id)
                  const project = getProjectInfo(selectedQuotation.project_id)
                  return (
                    <PrintDocument
                      type="quotation"
                      docNumber={selectedQuotation.quotation_number}
                      status={selectedQuotation.status}
                      clientName={client?.company_name || client?.contact_person || client?.email || 'N/A'}
                      clientAddress={client?.address}
                      clientGst={client?.gst_number}
                      projectTitle={project?.title || 'N/A'}
                      projectNumber={project?.project_number || 'N/A'}
                      items={selectedQuotation.items}
                      subtotal={selectedQuotation.subtotal}
                      taxPercent={selectedQuotation.tax_percent}
                      taxAmount={selectedQuotation.tax_amount}
                      discount={selectedQuotation.discount}
                      totalAmount={selectedQuotation.total_amount}
                      validUntil={selectedQuotation.valid_until}
                      createdAt={selectedQuotation.created_at}
                      notes={selectedQuotation.notes}
                      termsConditions={selectedQuotation.terms_conditions}
                    />
                  )
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
