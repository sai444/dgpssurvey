import { forwardRef } from 'react'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { useSiteSettingsStore } from '@/store/siteSettingsStore'

interface LineItem {
  description?: string
  quantity?: number
  unit?: string
  unit_price?: number
  amount?: number
}

interface PrintDocumentProps {
  type: 'quotation' | 'invoice'
  docNumber: string
  status: string
  clientName: string
  clientAddress?: string
  clientGst?: string
  projectTitle: string
  projectNumber: string
  items: LineItem[]
  subtotal?: number
  taxPercent?: number
  taxAmount?: number
  discount?: number
  totalAmount?: number
  amountPaid?: number
  dueDate?: string
  validUntil?: string
  createdAt?: string
  notes?: string
  termsConditions?: string
}

const PrintDocument = forwardRef<HTMLDivElement, PrintDocumentProps>(({
  type, docNumber, status, clientName, clientAddress, clientGst,
  projectTitle, projectNumber, items,
  subtotal, taxPercent, taxAmount, discount, totalAmount,
  amountPaid, dueDate, validUntil, createdAt, notes, termsConditions,
}, ref) => {
  const title = type === 'quotation' ? 'QUOTATION' : 'INVOICE'
  const balance = (totalAmount ?? 0) - (amountPaid ?? 0)
  const siteSettings = useSiteSettingsStore.getState().settings

  return (
    <div ref={ref} className="print-document bg-white text-black p-8 max-w-[210mm] mx-auto" style={{ fontFamily: 'Arial, sans-serif' }}>
      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-blue-600 pb-4 mb-6">
        <div className="flex items-center gap-3">
          {siteSettings?.logo_path && (
            <img
              src={`/api/v1/site-settings/logo/file`}
              alt="Logo"
              className="h-14 w-auto object-contain"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-blue-700">{siteSettings?.company_name || 'DGPS Survey'}</h1>
            <p className="text-sm text-gray-500 mt-1">{siteSettings?.tagline || 'Professional Survey & Mapping Services'}</p>
            {siteSettings?.address && <p className="text-xs text-gray-400 mt-1">{siteSettings.address}</p>}
            {siteSettings?.phone && <p className="text-xs text-gray-400">Tel: {siteSettings.phone}</p>}
            {siteSettings?.email && <p className="text-xs text-gray-400">Email: {siteSettings.email}</p>}
            {siteSettings?.gst_number && <p className="text-xs text-gray-400">GST: {siteSettings.gst_number}</p>}
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <p className="text-sm font-mono text-blue-600 mt-1">{docNumber}</p>
          <p className="text-xs text-gray-500 mt-1 capitalize">{status}</p>
        </div>
      </div>

      {/* Client & Doc Info */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Bill To</p>
          <p className="text-sm font-semibold text-gray-800">{clientName}</p>
          {clientAddress && <p className="text-xs text-gray-600 mt-1">{clientAddress}</p>}
          {clientGst && <p className="text-xs text-gray-600 mt-1">GST: {clientGst}</p>}
        </div>
        <div className="text-right">
          <div className="space-y-1 text-xs text-gray-600">
            <div><span className="font-semibold text-gray-700">Project:</span> {projectTitle}</div>
            <div><span className="font-semibold text-gray-700">Project #:</span> {projectNumber}</div>
            {createdAt && <div><span className="font-semibold text-gray-700">Date:</span> {formatDate(createdAt)}</div>}
            {dueDate && <div><span className="font-semibold text-gray-700">Due Date:</span> {formatDate(dueDate)}</div>}
            {validUntil && <div><span className="font-semibold text-gray-700">Valid Until:</span> {formatDate(validUntil)}</div>}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full mb-6 text-sm" style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr className="bg-blue-50">
            <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">#</th>
            <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Description</th>
            <th className="text-right px-3 py-2 border border-gray-200 font-semibold text-gray-700">Qty</th>
            <th className="text-left px-3 py-2 border border-gray-200 font-semibold text-gray-700">Unit</th>
            <th className="text-right px-3 py-2 border border-gray-200 font-semibold text-gray-700">Rate</th>
            <th className="text-right px-3 py-2 border border-gray-200 font-semibold text-gray-700">Amount</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-3 py-2 border border-gray-200 text-gray-500">{idx + 1}</td>
              <td className="px-3 py-2 border border-gray-200 text-gray-800">{item.description}</td>
              <td className="px-3 py-2 border border-gray-200 text-gray-700 text-right">{item.quantity}</td>
              <td className="px-3 py-2 border border-gray-200 text-gray-500">{item.unit}</td>
              <td className="px-3 py-2 border border-gray-200 text-gray-700 text-right">{formatCurrency(item.unit_price ?? 0)}</td>
              <td className="px-3 py-2 border border-gray-200 text-gray-900 font-medium text-right">
                {formatCurrency(item.amount ?? (item.quantity ?? 0) * (item.unit_price ?? 0))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <div className="flex justify-end mb-6">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between text-gray-600 px-3 py-1">
            <span>Subtotal</span><span className="font-medium">{formatCurrency(subtotal ?? 0)}</span>
          </div>
          <div className="flex justify-between text-gray-600 px-3 py-1">
            <span>Tax ({taxPercent ?? 0}%)</span><span className="font-medium">{formatCurrency(taxAmount ?? 0)}</span>
          </div>
          {(discount ?? 0) > 0 && (
            <div className="flex justify-between text-green-600 px-3 py-1">
              <span>Discount</span><span className="font-medium">-{formatCurrency(discount ?? 0)}</span>
            </div>
          )}
          <div className="flex justify-between text-gray-900 font-bold px-3 py-2 border-t-2 border-blue-600 mt-1">
            <span>Total</span><span>{formatCurrency(totalAmount ?? 0)}</span>
          </div>
          {type === 'invoice' && (amountPaid ?? 0) > 0 && (
            <>
              <div className="flex justify-between text-green-600 px-3 py-1">
                <span>Paid</span><span className="font-medium">{formatCurrency(amountPaid ?? 0)}</span>
              </div>
              <div className="flex justify-between text-red-600 font-bold px-3 py-1">
                <span>Balance Due</span><span>{formatCurrency(balance)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Notes */}
      {notes && (
        <div className="mb-4">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Notes</p>
          <p className="text-xs text-gray-600">{notes}</p>
        </div>
      )}

      {/* Terms & Conditions */}
      {termsConditions && (
        <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Terms & Conditions</p>
          <pre className="text-xs text-gray-600 whitespace-pre-wrap" style={{ fontFamily: 'Arial, sans-serif' }}>{termsConditions}</pre>
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-gray-200 pt-4 mt-8">
        {/* Bank Details */}
        {siteSettings?.bank_name && (
          <div className="mb-3 p-3 bg-gray-50 border border-gray-200 rounded text-xs text-gray-600">
            <p className="font-bold text-gray-400 uppercase tracking-wider mb-1">Bank Details</p>
            <p>Bank: {siteSettings.bank_name}</p>
            {siteSettings.bank_account_number && <p>A/C No: {siteSettings.bank_account_number}</p>}
            {siteSettings.bank_ifsc && <p>IFSC: {siteSettings.bank_ifsc}</p>}
            {siteSettings.bank_branch && <p>Branch: {siteSettings.bank_branch}</p>}
            {siteSettings.upi_id && <p>UPI: {siteSettings.upi_id}</p>}
          </div>
        )}
        <div className="text-center">
          <p className="text-xs text-gray-400">{siteSettings?.footer_text || 'Thank you for your business'}</p>
          <p className="text-xs text-gray-400 mt-1">{siteSettings?.copyright_text || `${siteSettings?.company_name || 'DGPS Survey'} — Professional Survey & Mapping Services`}</p>
        </div>
      </div>
    </div>
  )
})

PrintDocument.displayName = 'PrintDocument'
export default PrintDocument
