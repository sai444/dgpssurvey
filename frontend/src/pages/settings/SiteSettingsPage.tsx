import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Building2, Upload, Trash2, Save, Loader2, Image, Globe,
  Phone, Mail, MapPin, FileText, CreditCard, Receipt, Hash,
  type LucideIcon,
} from 'lucide-react'
import { siteSettingsApi } from '@/api'
import { useSiteSettingsStore } from '@/store/siteSettingsStore'
import { PageTitle } from '@/components/shared/Common'
import toast from 'react-hot-toast'
import type { SiteSettings } from '@/types'

function SectionHeader({ icon: Icon, title, subtitle }: { icon: LucideIcon; title: string; subtitle: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary-400" />
      </div>
      <div>
        <h3 className="font-semibold text-white">{title}</h3>
        <p className="text-xs text-dark-400">{subtitle}</p>
      </div>
    </div>
  )
}

export default function SiteSettingsPage() {
  const { settings, updateSettings } = useSiteSettingsStore()
  const [form, setForm] = useState<Partial<SiteSettings>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingFavicon, setUploadingFavicon] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    try {
      const { data } = await siteSettingsApi.get()
      setForm(data)
      updateSettings(data)
      if (data.logo_path) {
        setLogoPreview(siteSettingsApi.getLogoUrl() + `?t=${Date.now()}`)
      }
      if (data.favicon_path) {
        setFaviconPreview(siteSettingsApi.getFaviconUrl() + `?t=${Date.now()}`)
      }
    } catch {
      toast.error('Failed to load site settings')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await siteSettingsApi.update(form)
      updateSettings(data)
      toast.success('Site settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingLogo(true)
    try {
      const { data } = await siteSettingsApi.uploadLogo(file)
      updateSettings(data)
      setLogoPreview(siteSettingsApi.getLogoUrl() + `?t=${Date.now()}`)
      toast.success('Logo uploaded')
    } catch {
      toast.error('Failed to upload logo')
    } finally {
      setUploadingLogo(false)
      if (logoInputRef.current) logoInputRef.current.value = ''
    }
  }

  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingFavicon(true)
    try {
      const { data } = await siteSettingsApi.uploadFavicon(file)
      updateSettings(data)
      setFaviconPreview(siteSettingsApi.getFaviconUrl() + `?t=${Date.now()}`)
      toast.success('Favicon uploaded')
    } catch {
      toast.error('Failed to upload favicon')
    } finally {
      setUploadingFavicon(false)
      if (faviconInputRef.current) faviconInputRef.current.value = ''
    }
  }

  const handleDeleteLogo = async () => {
    try {
      const { data } = await siteSettingsApi.deleteLogo()
      updateSettings(data)
      setLogoPreview(null)
      toast.success('Logo removed')
    } catch {
      toast.error('Failed to remove logo')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    )
  }

  return (
    <div className="page-container max-w-4xl">
      <PageTitle title="Site Settings" subtitle="Configure your company branding, logos, and document defaults" />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Branding & Logo */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-6">
          <SectionHeader icon={Image} title="Branding" subtitle="Logo, company name, and tagline" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Logo Upload */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Company Logo</label>
              <div className="border-2 border-dashed border-dark-600 rounded-xl p-4 text-center">
                {logoPreview ? (
                  <div className="space-y-3">
                    <img
                      src={logoPreview}
                      alt="Logo"
                      className="max-h-24 mx-auto object-contain bg-white rounded-lg p-2"
                    />
                    <div className="flex gap-2 justify-center">
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        <Upload className="w-3.5 h-3.5" /> Change
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteLogo}
                        className="text-xs py-1.5 px-3 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                    className="py-6 w-full text-dark-400 hover:text-primary-400 transition-colors"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-8 h-8 mx-auto animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Click to upload logo</p>
                        <p className="text-xs text-dark-500 mt-1">PNG, JPG, SVG (max 5MB)</p>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Favicon Upload */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Favicon</label>
              <div className="border-2 border-dashed border-dark-600 rounded-xl p-4 text-center">
                {faviconPreview ? (
                  <div className="space-y-3">
                    <img
                      src={faviconPreview}
                      alt="Favicon"
                      className="w-16 h-16 mx-auto object-contain bg-white rounded-lg p-2"
                    />
                    <button
                      type="button"
                      onClick={() => faviconInputRef.current?.click()}
                      className="btn-secondary text-xs py-1.5 px-3"
                    >
                      <Upload className="w-3.5 h-3.5" /> Change
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => faviconInputRef.current?.click()}
                    disabled={uploadingFavicon}
                    className="py-6 w-full text-dark-400 hover:text-primary-400 transition-colors"
                  >
                    {uploadingFavicon ? (
                      <Loader2 className="w-8 h-8 mx-auto animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Click to upload favicon</p>
                        <p className="text-xs text-dark-500 mt-1">ICO, PNG (max 2MB)</p>
                      </>
                    )}
                  </button>
                )}
                <input
                  ref={faviconInputRef}
                  type="file"
                  accept="image/*,.ico"
                  onChange={handleFaviconUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Company Name</label>
              <input
                type="text"
                value={form.company_name || ''}
                onChange={(e) => handleChange('company_name', e.target.value)}
                className="input-field"
                placeholder="DGPS Survey"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Tagline</label>
              <input
                type="text"
                value={form.tagline || ''}
                onChange={(e) => handleChange('tagline', e.target.value)}
                className="input-field"
                placeholder="Professional Survey & Mapping Services"
              />
            </div>
          </div>
        </motion.div>

        {/* Contact Information */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6">
          <SectionHeader icon={Building2} title="Company Information" subtitle="Address, contact details, and tax information" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-300 mb-2">
                <MapPin className="w-3.5 h-3.5 inline mr-1" /> Address
              </label>
              <textarea
                value={form.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                className="input-field"
                rows={3}
                placeholder="123 Survey Street, City, State - PIN"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                <Phone className="w-3.5 h-3.5 inline mr-1" /> Phone
              </label>
              <input
                type="tel"
                value={form.phone || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
                className="input-field"
                placeholder="+91 98765 43210"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                <Mail className="w-3.5 h-3.5 inline mr-1" /> Email
              </label>
              <input
                type="email"
                value={form.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                className="input-field"
                placeholder="info@dgpssurvey.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                <Globe className="w-3.5 h-3.5 inline mr-1" /> Website
              </label>
              <input
                type="url"
                value={form.website || ''}
                onChange={(e) => handleChange('website', e.target.value)}
                className="input-field"
                placeholder="https://www.dgpssurvey.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                <Hash className="w-3.5 h-3.5 inline mr-1" /> GST Number
              </label>
              <input
                type="text"
                value={form.gst_number || ''}
                onChange={(e) => handleChange('gst_number', e.target.value)}
                className="input-field"
                placeholder="29ABCDE1234F1Z5"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">PAN Number</label>
              <input
                type="text"
                value={form.pan_number || ''}
                onChange={(e) => handleChange('pan_number', e.target.value)}
                className="input-field"
                placeholder="ABCDE1234F"
              />
            </div>
          </div>
        </motion.div>

        {/* Bank Details */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-6">
          <SectionHeader icon={CreditCard} title="Bank Details" subtitle="Bank account information for invoices" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Bank Name</label>
              <input
                type="text"
                value={form.bank_name || ''}
                onChange={(e) => handleChange('bank_name', e.target.value)}
                className="input-field"
                placeholder="State Bank of India"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Account Number</label>
              <input
                type="text"
                value={form.bank_account_number || ''}
                onChange={(e) => handleChange('bank_account_number', e.target.value)}
                className="input-field"
                placeholder="1234567890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">IFSC Code</label>
              <input
                type="text"
                value={form.bank_ifsc || ''}
                onChange={(e) => handleChange('bank_ifsc', e.target.value)}
                className="input-field"
                placeholder="SBIN0001234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Branch</label>
              <input
                type="text"
                value={form.bank_branch || ''}
                onChange={(e) => handleChange('bank_branch', e.target.value)}
                className="input-field"
                placeholder="Main Branch, City"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">UPI ID</label>
              <input
                type="text"
                value={form.upi_id || ''}
                onChange={(e) => handleChange('upi_id', e.target.value)}
                className="input-field"
                placeholder="company@upi"
              />
            </div>
          </div>
        </motion.div>

        {/* Document Defaults */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-6">
          <SectionHeader icon={FileText} title="Document Defaults" subtitle="Prefixes, copyright, and default terms" />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">
                <Receipt className="w-3.5 h-3.5 inline mr-1" /> Invoice Prefix
              </label>
              <input
                type="text"
                value={form.invoice_prefix || ''}
                onChange={(e) => handleChange('invoice_prefix', e.target.value)}
                className="input-field"
                placeholder="INV"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Quotation Prefix</label>
              <input
                type="text"
                value={form.quotation_prefix || ''}
                onChange={(e) => handleChange('quotation_prefix', e.target.value)}
                className="input-field"
                placeholder="QTN"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-300 mb-2">Copyright Text</label>
              <input
                type="text"
                value={form.copyright_text || ''}
                onChange={(e) => handleChange('copyright_text', e.target.value)}
                className="input-field"
                placeholder="© 2026 DGPS Survey. All rights reserved."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-300 mb-2">Footer Text (for printed documents)</label>
              <input
                type="text"
                value={form.footer_text || ''}
                onChange={(e) => handleChange('footer_text', e.target.value)}
                className="input-field"
                placeholder="Thank you for your business"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-300 mb-2">Default Invoice Terms & Conditions</label>
              <textarea
                value={form.invoice_terms || ''}
                onChange={(e) => handleChange('invoice_terms', e.target.value)}
                className="input-field"
                rows={4}
                placeholder="Enter default terms and conditions for invoices..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-300 mb-2">Default Quotation Terms & Conditions</label>
              <textarea
                value={form.quotation_terms || ''}
                onChange={(e) => handleChange('quotation_terms', e.target.value)}
                className="input-field"
                rows={4}
                placeholder="Enter default terms and conditions for quotations..."
              />
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button type="submit" disabled={saving} className="btn-primary px-8">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save All Settings</>}
          </button>
        </div>
      </form>
    </div>
  )
}
