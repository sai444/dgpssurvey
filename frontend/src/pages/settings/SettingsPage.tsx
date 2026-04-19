import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Shield, Bell, Save, Loader2, Building2 } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api'
import { PageTitle } from '@/components/shared/Common'
import { getInitials } from '@/utils/formatters'
import toast from 'react-hot-toast'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

export default function SettingsPage() {
  const { user, updateUser } = useAuthStore()
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone: user?.phone || '',
  })
  const [saving, setSaving] = useState(false)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data } = await authApi.updateMe(form)
      updateUser(data)
      toast.success('Profile updated')
    } catch {
      toast.error('Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="page-container max-w-3xl">
      <PageTitle title="Settings" subtitle="Manage your account preferences" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card"
      >
        {/* Profile Header */}
        <div className="p-6 border-b border-dark-700/30">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl font-bold text-white shadow-glow">
              {user ? getInitials(user.full_name) : '?'}
            </div>
            <div>
              <h3 className="text-xl font-display font-bold text-white">{user?.full_name}</h3>
              <p className="text-dark-400">{user?.email}</p>
              <span className="badge-info mt-2 capitalize">{user?.role}</span>
            </div>
          </div>
        </div>

        {/* Profile Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Full Name</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="input-field"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Email</label>
            <input
              type="email"
              value={user?.email || ''}
              className="input-field opacity-50 cursor-not-allowed"
              disabled
            />
            <p className="text-xs text-dark-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input-field"
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="pt-2">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
            </button>
          </div>
        </form>
      </motion.div>

      {/* Additional Settings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-400" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Security</h4>
              <p className="text-xs text-dark-400">Password & authentication</p>
            </div>
          </div>
          <button className="btn-secondary w-full text-sm py-2">Change Password</button>
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Bell className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Notifications</h4>
              <p className="text-xs text-dark-400">Email & push notifications</p>
            </div>
          </div>
          <button className="btn-secondary w-full text-sm py-2">Configure</button>
        </div>
      </div>
    </div>
  )
}
