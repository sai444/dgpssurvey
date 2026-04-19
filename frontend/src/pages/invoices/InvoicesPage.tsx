import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Receipt, Plus, Search, X, Loader2, IndianRupee,
  Calendar, CreditCard, CheckCircle, FileText, ArrowRight,
  Send, Clock, AlertTriangle, Ban, Eye, ChevronDown, Printer
} from 'lucide-react'
import { invoicesApi, projectsApi, clientsApi, quotationsApi, priceMasterApi } from '@/api'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { LoadingSpinner, EmptyState, PageTitle } from '@/components/shared/Common'
import StatusBadge from '@/components/shared/StatusBadge'
import PrintDocument from '@/components/shared/PrintDocument'
import type { Invoice, Quotation, Payment, PaymentTerm, Client, Project } from '@/types'
import toast from 'react-hot-toast'

type CreateMode = 'manual' | 'from-quotation'

export default function InvoicesPage() {
  const [showCreate, setShowCreate] = useState(false)
  const [createMode, setCreateMode] = useState<CreateMode>('manual')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showPayment, setShowPayment] = useState(false)
  const [showPrint, setShowPrint] = useState(false)
  const queryClient = useQueryClient()

  const { data: invoices, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoicesApi.list().then((r) => r.data),
  })
  const { data: projects } = useQuery({ queryKey: ['projects'], queryFn: () => projectsApi.list().then((r) => r.data) })
  const { data: clients } = useQuery({ queryKey: ['clients'], queryFn: () => clientsApi.list().then((r) => r.data) })
  const { data: quotations } = useQuery({ queryKey: ['quotations'], queryFn: () => quotationsApi.list().then((r) => r.data) })
  const { data: paymentTerms } = useQuery({ queryKey: ['payment-terms'], queryFn: () => priceMasterApi.listTerms().then(r => r.data) })

  // --- Form State ---
  const emptyForm = {
    project_id: '', client_id: '', quotation_id: '', tax_percent: '18', discount: '0', due_date: '', notes: '', terms_conditions: '',
    items: [{ description: '', quantity: '1', unit: 'sq.ft', unit_price: '0' }]
  }
  const [form, setForm] = useState(emptyForm)

  const emptyPaymentForm = { amount: '', payment_method: 'bank_transfer', reference_number: '', payment_date: '', notes: '' }
  const [paymentForm, setPaymentForm] = useState(emptyPaymentForm)

  // --- Mutations ---
  const createMutation = useMutation({
    mutationFn: (data: any) => invoicesApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setShowCreate(false)
      setForm(emptyForm)
      toast.success('Invoice created')
      if (response.data) {
        setSelectedInvoice(response.data)
        setShowPrint(true)
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to create invoice'),
  })

  const createFromQuotationMutation = useMutation({
    mutationFn: ({ quotationId, params }: { quotationId: string; params?: { due_date?: string; notes?: string } }) =>
      invoicesApi.createFromQuotation(quotationId, params),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setShowCreate(false)
      setForm(emptyForm)
      toast.success('Invoice created from quotation')
      if (response.data) {
        setSelectedInvoice(response.data)
        setShowPrint(true)
      }
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to create invoice'),
  })

  const paymentMutation = useMutation({
    mutationFn: ({ invoiceId, data }: { invoiceId: string; data: any }) =>
      invoicesApi.recordPayment(invoiceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['payments', selectedInvoice?.id] })
      setShowPayment(false)
      setPaymentForm(emptyPaymentForm)
      toast.success('Payment recorded')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to record payment'),
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      invoicesApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Status updated')
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || 'Failed to update status'),
  })

  // --- Payments query for selected invoice ---
  const { data: payments } = useQuery({
    queryKey: ['payments', selectedInvoice?.id],
    queryFn: () => invoicesApi.getPayments(selectedInvoice!.id).then((r) => r.data),
    enabled: !!selectedInvoice,
  })

  // --- Handlers ---
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (createMode === 'from-quotation') {
      createFromQuotationMutation.mutate({
        quotationId: form.quotation_id,
        params: {
          due_date: form.due_date || undefined,
          notes: form.notes || undefined,
        },
      })
    } else {
      createMutation.mutate({
        project_id: form.project_id,
        client_id: form.client_id,
        tax_percent: parseFloat(form.tax_percent),
        discount: parseFloat(form.discount),
        due_date: form.due_date || undefined,
        notes: form.notes || undefined,
        terms_conditions: form.terms_conditions || undefined,
        items: form.items.map((item) => ({
          description: item.description,
          quantity: parseFloat(item.quantity),
          unit: item.unit,
          unit_price: parseFloat(item.unit_price),
        })),
      })
    }
  }

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInvoice) return
    paymentMutation.mutate({
      invoiceId: selectedInvoice.id,
      data: {
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number || undefined,
        payment_date: paymentForm.payment_date || undefined,
        notes: paymentForm.notes || undefined,
      },
    })
  }

  const handleImportFromQuotation = (quotation: Quotation) => {
    setForm({
      project_id: quotation.project_id || '',
      client_id: quotation.client_id || '',
      quotation_id: quotation.id,
      tax_percent: String(quotation.tax_percent ?? 18),
      discount: String(quotation.discount ?? 0),
      due_date: '',
      notes: quotation.notes || '',
      terms_conditions: '',
      items: quotation.items.map((item) => ({
        description: item.description || '',
        quantity: String(item.quantity ?? 1),
        unit: item.unit || 'sq.ft',
        unit_price: String(item.unit_price ?? 0),
      })),
    })
    setCreateMode('manual')
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

  const applySmartTerms = () => {
    if (!paymentTerms?.length) { toast.error('No payment terms configured. Go to Price Master to set up.'); return }
    const sorted = [...paymentTerms].sort((a: PaymentTerm, b: PaymentTerm) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    const lines = sorted.map((t: PaymentTerm, i: number) =>
      `${i + 1}. ${t.milestone_label} — ${t.milestone_percent}%${t.description ? ` (${t.description})` : ''}`
    )
    const tc = `Payment Terms:\n${lines.join('\n')}`
    setForm({ ...form, terms_conditions: tc })
    toast.success('Smart T&C applied')
  }

  // --- Filtering ---
  const filtered = useMemo(() => {
    let list = invoices || []
    if (search) {
      list = list.filter((inv: Invoice) =>
        inv.invoice_number.toLowerCase().includes(search.toLowerCase())
      )
    }
    if (statusFilter !== 'all') {
      list = list.filter((inv: Invoice) => inv.status === statusFilter)
    }
    return list
  }, [invoices, search, statusFilter])

  // --- Stats ---
  const stats = useMemo(() => {
    if (!invoices?.length) return { total: 0, paid: 0, pending: 0, overdue: 0 }
    return {
      total: invoices.reduce((s: number, i: Invoice) => s + (i.total_amount || 0), 0),
      paid: invoices.reduce((s: number, i: Invoice) => s + (i.amount_paid || 0), 0),
      pending: invoices.filter((i: Invoice) => ['draft', 'sent', 'partial'].includes(i.status))
        .reduce((s: number, i: Invoice) => s + ((i.total_amount || 0) - (i.amount_paid || 0)), 0),
      overdue: invoices.filter((i: Invoice) => i.status === 'overdue').length,
    }
  }, [invoices])

  const getClientName = (clientId?: string) => {
    const client = clients?.find((c: any) => c.id === clientId)
    return client?.company_name || client?.contact_person || '—'
  }

  const getClientInfo = (clientId?: string) => clients?.find((c: Client) => c.id === clientId)

  const getProjectInfo = (projectId?: string) => projects?.find((p: Project) => p.id === projectId)

  const getProjectTitle = (projectId?: string) => {
    const project = projects?.find((p: any) => p.id === projectId)
    return project ? `${project.project_number} - ${project.title}` : '—'
  }

  const acceptedQuotations = quotations?.filter((q: Quotation) => q.status === 'accepted') || []

  const getBalanceDue = (inv: Invoice) => (inv.total_amount || 0) - (inv.amount_paid || 0)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <PageTitle title="Invoices" subtitle={`${filtered.length} invoices`} />
        <button onClick={() => { setForm(emptyForm); setCreateMode('manual'); setShowCreate(true) }} className="btn-primary">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <IndianRupee className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-dark-500">Total Invoiced</p>
              <p className="text-lg font-bold text-white">{formatCurrency(stats.total)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs text-dark-500">Total Received</p>
              <p className="text-lg font-bold text-emerald-400">{formatCurrency(stats.paid)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-dark-500">Pending</p>
              <p className="text-lg font-bold text-amber-400">{formatCurrency(stats.pending)}</p>
            </div>
          </div>
        </div>
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <p className="text-xs text-dark-500">Overdue</p>
              <p className="text-lg font-bold text-rose-400">{stats.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input type="text" placeholder="Search invoices..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field pl-11" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto min-w-[140px]">
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="partial">Partial</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {isLoading ? <LoadingSpinner /> : filtered.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices" description="Create your first invoice"
          action={<button onClick={() => { setForm(emptyForm); setCreateMode('manual'); setShowCreate(true) }} className="btn-primary"><Plus className="w-4 h-4" /> New Invoice</button>} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((inv: Invoice, i: number) => {
            const balanceDue = getBalanceDue(inv)
            const paidPercent = inv.total_amount ? Math.min(100, ((inv.amount_paid || 0) / inv.total_amount) * 100) : 0
            return (
              <motion.div key={inv.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="glass-card-hover p-5 cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-xs font-mono text-dark-500">{inv.invoice_number}</p>
                    <StatusBadge status={inv.status} className="mt-1" />
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-white">{formatCurrency(inv.total_amount)}</p>
                    <p className="text-xs text-dark-500">Total amount</p>
                  </div>
                </div>

                <div className="text-sm text-dark-400 mb-3">
                  <p className="text-dark-300 font-medium truncate">{getClientName(inv.client_id)}</p>
                  <p className="text-xs truncate mt-0.5">{getProjectTitle(inv.project_id)}</p>
                </div>

                {/* Payment Progress */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-dark-500 mb-1">
                    <span>Paid: {formatCurrency(inv.amount_paid)}</span>
                    <span>Balance: {formatCurrency(balanceDue)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-dark-700/50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${paidPercent >= 100 ? 'bg-emerald-500' : paidPercent > 0 ? 'bg-amber-500' : 'bg-dark-600'}`}
                      style={{ width: `${paidPercent}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-1.5 text-sm text-dark-400">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span className="text-dark-300">{formatCurrency(inv.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax ({inv.tax_percent}%)</span>
                    <span className="text-dark-300">{formatCurrency(inv.tax_amount)}</span>
                  </div>
                  {(inv.discount ?? 0) > 0 && (
                    <div className="flex justify-between">
                      <span>Discount</span>
                      <span className="text-emerald-400">-{formatCurrency(inv.discount)}</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between mt-4 pt-3 border-t border-dark-700/30 text-xs text-dark-500">
                  <span>{inv.items.length} items</span>
                  <div className="flex items-center gap-3">
                    {inv.quotation_id && (
                      <span className="text-primary-400 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> From Quote
                      </span>
                    )}
                    {inv.due_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Due {formatDate(inv.due_date)}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* ============ CREATE INVOICE MODAL ============ */}
      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-dark-700/30">
                <h2 className="text-xl font-display font-bold text-white">Create Invoice</h2>
                <button onClick={() => setShowCreate(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>

              {/* Mode Tabs */}
              <div className="flex border-b border-dark-700/30">
                <button
                  type="button"
                  onClick={() => { setCreateMode('manual'); setForm(emptyForm) }}
                  className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${createMode === 'manual' ? 'text-primary-400 border-b-2 border-primary-400 bg-primary-400/5' : 'text-dark-400 hover:text-dark-300'}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" /> Create Manually
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setCreateMode('from-quotation')}
                  className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${createMode === 'from-quotation' ? 'text-primary-400 border-b-2 border-primary-400 bg-primary-400/5' : 'text-dark-400 hover:text-dark-300'}`}
                >
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-4 h-4" /> Import from Quotation
                  </div>
                </button>
              </div>

              {createMode === 'from-quotation' ? (
                <div className="p-6 space-y-4">
                  {/* Quick Create from Quotation */}
                  <div>
                    <label className="block text-sm font-medium text-dark-300 mb-1.5">Select Accepted Quotation</label>
                    <select
                      value={form.quotation_id}
                      onChange={(e) => setForm({ ...form, quotation_id: e.target.value })}
                      className="input-field"
                      required
                    >
                      <option value="">Choose a quotation...</option>
                      {(quotations || []).map((q: Quotation) => (
                        <option key={q.id} value={q.id}>
                          {q.quotation_number} — {formatCurrency(q.total_amount)} ({q.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Preview selected quotation */}
                  {form.quotation_id && (() => {
                    const sel = quotations?.find((q: Quotation) => q.id === form.quotation_id)
                    if (!sel) return null
                    return (
                      <div className="p-4 rounded-lg bg-dark-800/60 border border-dark-700/30 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-mono text-dark-400">{sel.quotation_number}</span>
                          <StatusBadge status={sel.status} />
                        </div>
                        <div className="space-y-1 text-sm text-dark-400">
                          <div className="flex justify-between"><span>Client</span><span className="text-dark-300">{getClientName(sel.client_id)}</span></div>
                          <div className="flex justify-between"><span>Project</span><span className="text-dark-300">{getProjectTitle(sel.project_id)}</span></div>
                          <div className="flex justify-between"><span>Items</span><span className="text-dark-300">{sel.items.length}</span></div>
                        </div>
                        <div className="border-t border-dark-700/30 pt-2 space-y-1 text-sm text-dark-400">
                          <div className="flex justify-between"><span>Subtotal</span><span className="text-dark-300">{formatCurrency(sel.subtotal)}</span></div>
                          <div className="flex justify-between"><span>Tax ({sel.tax_percent}%)</span><span className="text-dark-300">{formatCurrency(sel.tax_amount)}</span></div>
                          {(sel.discount ?? 0) > 0 && <div className="flex justify-between"><span>Discount</span><span className="text-emerald-400">-{formatCurrency(sel.discount)}</span></div>}
                          <div className="flex justify-between font-bold text-white pt-1 border-t border-dark-700/30"><span>Total</span><span>{formatCurrency(sel.total_amount)}</span></div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleImportFromQuotation(sel)}
                          className="w-full mt-2 py-2 px-4 rounded-lg bg-dark-700/50 text-dark-300 hover:bg-dark-700 hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <ArrowRight className="w-4 h-4" /> Import & Edit Items Before Creating
                        </button>
                      </div>
                    )
                  })()}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-1.5">Due Date</label>
                      <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="input-field" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-300 mb-1.5">Notes</label>
                      <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" placeholder="Optional notes..." />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                    <button
                      type="button"
                      disabled={!form.quotation_id || createFromQuotationMutation.isPending}
                      onClick={() => {
                        createFromQuotationMutation.mutate({
                          quotationId: form.quotation_id,
                          params: {
                            due_date: form.due_date || undefined,
                            notes: form.notes || undefined,
                          },
                        })
                      }}
                      className="btn-primary flex-1"
                    >
                      {createFromQuotationMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                        <><Receipt className="w-4 h-4" /> Create Invoice</>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* Manual creation form */
                <form onSubmit={handleCreate} className="p-6 space-y-4">
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
                      <label className="block text-sm font-medium text-dark-300 mb-1.5">Due Date</label>
                      <input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="input-field" />
                    </div>
                  </div>

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
                      <button type="button" onClick={applySmartTerms} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
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
                    <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary flex-1">Cancel</button>
                    <button type="submit" disabled={createMutation.isPending} className="btn-primary flex-1">
                      {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                        <><Receipt className="w-4 h-4" /> Create Invoice</>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ INVOICE DETAIL MODAL ============ */}
      <AnimatePresence>
        {selectedInvoice && !showPayment && !showPrint && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedInvoice(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-dark-700/30">
                <div>
                  <h2 className="text-xl font-display font-bold text-white">{selectedInvoice.invoice_number}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    <StatusBadge status={selectedInvoice.status} />
                    {selectedInvoice.quotation_id && (
                      <span className="text-xs text-primary-400 bg-primary-400/10 px-2 py-0.5 rounded-full">From Quotation</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setShowPrint(true)}
                    className="px-4 py-2 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 text-sm font-medium transition-colors flex items-center gap-2">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <button onClick={() => setSelectedInvoice(null)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {/* Client & Project Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-dark-500 text-xs mb-1">Client</p>
                    <p className="text-dark-200 font-medium">{getClientName(selectedInvoice.client_id)}</p>
                  </div>
                  <div>
                    <p className="text-dark-500 text-xs mb-1">Project</p>
                    <p className="text-dark-200 font-medium">{getProjectTitle(selectedInvoice.project_id)}</p>
                  </div>
                  {selectedInvoice.due_date && (
                    <div>
                      <p className="text-dark-500 text-xs mb-1">Due Date</p>
                      <p className="text-dark-200 font-medium">{formatDate(selectedInvoice.due_date)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-dark-500 text-xs mb-1">Created</p>
                    <p className="text-dark-200 font-medium">{formatDate(selectedInvoice.created_at)}</p>
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <h3 className="text-sm font-semibold text-dark-300 mb-2">Line Items</h3>
                  <div className="rounded-lg border border-dark-700/30 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-dark-800/40">
                          <th className="text-left px-4 py-2 text-xs text-dark-500 font-medium">Description</th>
                          <th className="text-right px-4 py-2 text-xs text-dark-500 font-medium">Qty</th>
                          <th className="text-left px-4 py-2 text-xs text-dark-500 font-medium">Unit</th>
                          <th className="text-right px-4 py-2 text-xs text-dark-500 font-medium">Rate</th>
                          <th className="text-right px-4 py-2 text-xs text-dark-500 font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dark-700/20">
                        {selectedInvoice.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-2 text-dark-200">{item.description}</td>
                            <td className="px-4 py-2 text-dark-300 text-right">{item.quantity}</td>
                            <td className="px-4 py-2 text-dark-400">{item.unit}</td>
                            <td className="px-4 py-2 text-dark-300 text-right">{formatCurrency(item.unit_price)}</td>
                            <td className="px-4 py-2 text-white font-medium text-right">{formatCurrency(item.amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Financial Summary */}
                <div className="p-4 rounded-lg bg-dark-800/60 border border-dark-700/30 space-y-2 text-sm">
                  <div className="flex justify-between text-dark-400">
                    <span>Subtotal</span><span className="text-dark-300">{formatCurrency(selectedInvoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-dark-400">
                    <span>Tax ({selectedInvoice.tax_percent}%)</span><span className="text-dark-300">{formatCurrency(selectedInvoice.tax_amount)}</span>
                  </div>
                  {(selectedInvoice.discount ?? 0) > 0 && (
                    <div className="flex justify-between text-dark-400">
                      <span>Discount</span><span className="text-emerald-400">-{formatCurrency(selectedInvoice.discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-2 border-t border-dark-700/30 font-bold text-white">
                    <span>Total</span><span>{formatCurrency(selectedInvoice.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Paid</span><span>{formatCurrency(selectedInvoice.amount_paid)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-amber-400">
                    <span>Balance Due</span><span>{formatCurrency(getBalanceDue(selectedInvoice))}</span>
                  </div>
                </div>

                {/* Payment History */}
                {payments && payments.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-dark-300 mb-2">Payment History</h3>
                    <div className="space-y-2">
                      {payments.map((p: Payment) => (
                        <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-dark-800/40 border border-dark-700/20 text-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                              <CreditCard className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                              <p className="text-dark-200 font-medium">{formatCurrency(p.amount)}</p>
                              <p className="text-xs text-dark-500">{p.payment_method?.replace('_', ' ')} {p.reference_number ? `• ${p.reference_number}` : ''}</p>
                            </div>
                          </div>
                          <span className="text-xs text-dark-500">{formatDate(p.payment_date || p.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedInvoice.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-dark-300 mb-1">Notes</h3>
                    <p className="text-sm text-dark-400">{selectedInvoice.notes}</p>
                  </div>
                )}

                {selectedInvoice.terms_conditions && (
                  <div>
                    <h3 className="text-sm font-semibold text-dark-300 mb-1">Terms & Conditions</h3>
                    <pre className="text-xs text-dark-400 whitespace-pre-wrap font-mono bg-dark-800/40 p-3 rounded-lg border border-dark-700/30">
                      {selectedInvoice.terms_conditions}
                    </pre>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'cancelled' && (
                    <button
                      onClick={() => { setPaymentForm(emptyPaymentForm); setShowPayment(true) }}
                      className="btn-primary text-sm"
                    >
                      <CreditCard className="w-4 h-4" /> Record Payment
                    </button>
                  )}
                  {selectedInvoice.status === 'draft' && (
                    <button
                      onClick={() => statusMutation.mutate({ id: selectedInvoice.id, status: 'sent' })}
                      className="px-4 py-2 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" /> Mark as Sent
                    </button>
                  )}
                  {selectedInvoice.status !== 'overdue' && selectedInvoice.status !== 'paid' && selectedInvoice.status !== 'cancelled' && (
                    <button
                      onClick={() => statusMutation.mutate({ id: selectedInvoice.id, status: 'overdue' })}
                      className="px-4 py-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <AlertTriangle className="w-4 h-4" /> Mark Overdue
                    </button>
                  )}
                  {selectedInvoice.status !== 'cancelled' && selectedInvoice.status !== 'paid' && (
                    <button
                      onClick={() => statusMutation.mutate({ id: selectedInvoice.id, status: 'cancelled' })}
                      className="px-4 py-2 rounded-lg bg-dark-700/50 text-dark-400 hover:bg-dark-700 hover:text-dark-300 text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Ban className="w-4 h-4" /> Cancel
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ RECORD PAYMENT MODAL ============ */}
      <AnimatePresence>
        {showPayment && selectedInvoice && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowPayment(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} className="glass-card w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-dark-700/30">
                <div>
                  <h2 className="text-xl font-display font-bold text-white">Record Payment</h2>
                  <p className="text-sm text-dark-500 mt-0.5">{selectedInvoice.invoice_number} — Balance: {formatCurrency(getBalanceDue(selectedInvoice))}</p>
                </div>
                <button onClick={() => setShowPayment(false)} className="text-dark-400 hover:text-white"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleRecordPayment} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Amount (₹) *</label>
                  <input type="number" step="0.01" min="0.01" value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })} className="input-field" required
                    placeholder={`Max ${formatCurrency(getBalanceDue(selectedInvoice))}`} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Payment Method</label>
                  <select value={paymentForm.payment_method} onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })} className="input-field">
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="upi">UPI</option>
                    <option value="cash">Cash</option>
                    <option value="cheque">Cheque</option>
                    <option value="online">Online</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Reference Number</label>
                  <input type="text" value={paymentForm.reference_number}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference_number: e.target.value })} className="input-field" placeholder="Transaction ID, Cheque No., etc." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Payment Date</label>
                  <input type="date" value={paymentForm.payment_date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} className="input-field" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-1.5">Notes</label>
                  <textarea value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} className="input-field h-20 resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowPayment(false)} className="btn-secondary flex-1">Cancel</button>
                  <button type="submit" disabled={paymentMutation.isPending} className="btn-primary flex-1">
                    {paymentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                      <><CheckCircle className="w-4 h-4" /> Record Payment</>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============ PRINT PREVIEW MODAL ============ */}
      <AnimatePresence>
        {showPrint && selectedInvoice && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="print-overlay fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowPrint(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="print-content-wrapper bg-dark-900 rounded-2xl border border-dark-700/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="no-print flex items-center justify-between p-4 border-b border-dark-700/30">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-display font-bold text-white">{selectedInvoice.invoice_number}</h2>
                  <StatusBadge status={selectedInvoice.status} />
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handlePrint}
                    className="px-4 py-2 rounded-lg bg-primary-500/10 text-primary-400 hover:bg-primary-500/20 text-sm font-medium transition-colors flex items-center gap-2">
                    <Printer className="w-4 h-4" /> Print
                  </button>
                  <button onClick={() => setShowPrint(false)} className="text-dark-400 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-4">
                {(() => {
                  const client = getClientInfo(selectedInvoice.client_id)
                  const project = getProjectInfo(selectedInvoice.project_id)
                  return (
                    <PrintDocument
                      type="invoice"
                      docNumber={selectedInvoice.invoice_number}
                      status={selectedInvoice.status}
                      clientName={client?.company_name || client?.contact_person || client?.email || 'N/A'}
                      clientAddress={client?.address}
                      clientGst={client?.gst_number}
                      projectTitle={project?.title || 'N/A'}
                      projectNumber={project?.project_number || 'N/A'}
                      items={selectedInvoice.items}
                      subtotal={selectedInvoice.subtotal}
                      taxPercent={selectedInvoice.tax_percent}
                      taxAmount={selectedInvoice.tax_amount}
                      discount={selectedInvoice.discount}
                      totalAmount={selectedInvoice.total_amount}
                      amountPaid={selectedInvoice.amount_paid}
                      dueDate={selectedInvoice.due_date}
                      createdAt={selectedInvoice.created_at}
                      notes={selectedInvoice.notes}
                      termsConditions={selectedInvoice.terms_conditions}
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
