import { Bell, Menu, Search, Moon, Sun } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getInitials } from '@/utils/formatters'
import { useState } from 'react'

interface HeaderProps {
  onMenuToggle: () => void
}

export default function Header({ onMenuToggle }: HeaderProps) {
  const { user } = useAuthStore()
  const [searchOpen, setSearchOpen] = useState(false)

  return (
    <header className="sticky top-0 z-30 bg-dark-950/60 backdrop-blur-2xl border-b border-dark-700/30">
      <div className="flex items-center justify-between h-16 px-4 md:px-6">
        {/* Left */}
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl text-dark-400 hover:text-white hover:bg-dark-800/50 transition-all"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search */}
          <div className="hidden md:flex items-center gap-2 bg-dark-800/40 rounded-xl px-4 py-2.5 border border-dark-700/30 focus-within:border-primary-500/30 transition-all w-80">
            <Search className="w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search projects, clients, invoices..."
              className="bg-transparent text-sm text-white placeholder:text-dark-500 focus:outline-none w-full"
            />
            <kbd className="hidden lg:inline-flex items-center px-1.5 py-0.5 rounded bg-dark-700/50 text-[10px] text-dark-400 font-mono">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            className="md:hidden p-2 rounded-xl text-dark-400 hover:text-white hover:bg-dark-800/50 transition-all"
          >
            <Search className="w-5 h-5" />
          </button>

          <button className="relative p-2 rounded-xl text-dark-400 hover:text-white hover:bg-dark-800/50 transition-all">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
          </button>

          <div className="hidden sm:flex items-center gap-3 ml-2 pl-4 border-l border-dark-700/50">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{user?.full_name}</p>
              <p className="text-xs text-dark-400 capitalize">{user?.role}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xs font-bold text-white ring-2 ring-dark-700/50">
              {user ? getInitials(user.full_name) : '?'}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile search */}
      {searchOpen && (
        <div className="md:hidden px-4 pb-3">
          <div className="flex items-center gap-2 bg-dark-800/40 rounded-xl px-4 py-2.5 border border-dark-700/30">
            <Search className="w-4 h-4 text-dark-400" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent text-sm text-white placeholder:text-dark-500 focus:outline-none w-full"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  )
}
