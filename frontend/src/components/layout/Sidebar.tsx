import { NavLink, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, FolderKanban, Users, UserCircle, Compass,
  FileText, Receipt, TicketCheck, Settings, LogOut, X, Satellite,
  ChevronLeft, Menu, IndianRupee, Building2
} from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { useSiteSettingsStore } from '@/store/siteSettingsStore'
import { getInitials } from '@/utils/formatters'
import { useState, useEffect } from 'react'

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/clients', icon: Users, label: 'Clients', adminOnly: true },
  { to: '/surveyors', icon: Compass, label: 'Surveyors', adminOnly: true },
  { to: '/users', icon: UserCircle, label: 'Users', adminOnly: true },
  { to: '/quotations', icon: FileText, label: 'Quotations' },
  { to: '/invoices', icon: Receipt, label: 'Invoices' },
  { to: '/price-master', icon: IndianRupee, label: 'Price Master', adminOnly: true },
  { to: '/tickets', icon: TicketCheck, label: 'Tickets' },
  { to: '/settings/site', icon: Building2, label: 'Site Settings', adminOnly: true },
]

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { user, logout } = useAuthStore()
  const { settings, fetchSettings } = useSiteSettingsStore()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const filteredNav = navItems.filter(
    (item) => !item.adminOnly || user?.role === 'admin'
  )

  const sidebarWidth = collapsed ? 'w-20' : 'w-72'

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col
          ${sidebarWidth} bg-dark-900/80 backdrop-blur-2xl border-r border-dark-700/50
          transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-5 border-b border-dark-700/50">
          <div className="flex items-center gap-3">
            {settings?.logo_path ? (
              <img
                src={`/api/v1/site-settings/logo/file?t=${settings.updated_at || ''}`}
                alt="Logo"
                className="w-10 h-10 rounded-xl object-contain bg-white p-1"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
                <Satellite className="w-5 h-5 text-white" />
              </div>
            )}
            {!collapsed && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <h1 className="font-display font-bold text-lg gradient-text">{settings?.company_name || 'DGPS Survey'}</h1>
                <p className="text-[10px] text-dark-400 tracking-widest uppercase">{settings?.tagline ? settings.tagline.substring(0, 30) : 'Management'}</p>
              </motion.div>
            )}
          </div>
          <button onClick={onClose} className="lg:hidden text-dark-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex text-dark-400 hover:text-white transition-colors"
          >
            <ChevronLeft className={`w-4 h-4 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              className={({ isActive }) =>
                `sidebar-link group ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-3' : ''}`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0 transition-colors group-hover:text-primary-400" />
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User section */}
        <div className="border-t border-dark-700/50 p-4">
          <div className={`flex items-center gap-3 mb-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
              {user ? getInitials(user.full_name) : '?'}
            </div>
            {!collapsed && (
              <div className="overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
                <p className="text-xs text-dark-400 capitalize">{user?.role}</p>
              </div>
            )}
          </div>

          <div className={`flex gap-2 ${collapsed ? 'flex-col items-center' : ''}`}>
            <NavLink
              to="/settings/profile"
              onClick={onClose}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800/50 transition-all text-sm"
            >
              <Settings className="w-4 h-4" />
              {!collapsed && <span>Settings</span>}
            </NavLink>
            <button
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-all text-sm"
            >
              <LogOut className="w-4 h-4" />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
