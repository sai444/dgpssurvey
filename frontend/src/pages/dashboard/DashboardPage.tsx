import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FolderKanban, Users, Receipt, TicketCheck, TrendingUp,
  ArrowUpRight, ArrowDownRight, Clock, AlertCircle, IndianRupee,
  Activity, Target, Zap
} from 'lucide-react'
import { dashboardApi } from '@/api'
import { formatCurrency, formatDate, getStatusColor } from '@/utils/formatters'
import { LoadingSpinner, PageTitle } from '@/components/shared/Common'
import StatusBadge from '@/components/shared/StatusBadge'
import { useAuthStore } from '@/store/authStore'
import { Link } from 'react-router-dom'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
}

export default function DashboardPage() {
  const { user } = useAuthStore()
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.getStats().then((r) => r.data),
  })

  const { data: recentProjects } = useQuery({
    queryKey: ['recent-projects'],
    queryFn: () => dashboardApi.getRecentProjects().then((r) => r.data),
  })

  if (statsLoading) return <LoadingSpinner />

  const statCards = [
    {
      label: 'Total Projects',
      value: stats?.total_projects || 0,
      icon: FolderKanban,
      color: 'from-primary-500 to-primary-600',
      textColor: 'text-primary-400',
      bgGlow: 'bg-primary-500/10',
      change: `${stats?.active_projects || 0} active`,
      up: true,
    },
    {
      label: 'Total Revenue',
      value: formatCurrency(stats?.total_revenue),
      icon: IndianRupee,
      color: 'from-emerald-500 to-emerald-600',
      textColor: 'text-emerald-400',
      bgGlow: 'bg-emerald-500/10',
      change: 'Revenue collected',
      up: true,
    },
    {
      label: 'Pending Amount',
      value: formatCurrency(stats?.pending_amount),
      icon: Clock,
      color: 'from-amber-500 to-amber-600',
      textColor: 'text-amber-400',
      bgGlow: 'bg-amber-500/10',
      change: 'Outstanding',
      up: false,
    },
    {
      label: 'Open Tickets',
      value: stats?.open_tickets || 0,
      icon: TicketCheck,
      color: 'from-rose-500 to-rose-600',
      textColor: 'text-rose-400',
      bgGlow: 'bg-rose-500/10',
      change: `${stats?.total_tickets || 0} total`,
      up: false,
    },
  ]

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <motion.h1
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="text-2xl md:text-3xl font-display font-bold text-white"
          >
            Welcome back, <span className="gradient-text">{user?.full_name?.split(' ')[0]}</span>
          </motion.h1>
          <p className="text-sm text-dark-400 mt-1">Here's what's happening with your survey operations</p>
        </div>
        <Link to="/projects" className="btn-primary">
          <FolderKanban className="w-4 h-4" />
          View Projects
        </Link>
      </div>

      {/* Stats Grid */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
      >
        {statCards.map((stat, i) => (
          <motion.div key={i} variants={item} className="stat-card group cursor-pointer">
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 rounded-2xl ${stat.bgGlow} flex items-center justify-center ring-1 ring-white/5`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${stat.up ? 'text-emerald-400' : 'text-amber-400'}`}>
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                {stat.change}
              </div>
            </div>
            <div className="text-2xl md:text-3xl font-bold text-white mb-1 font-display">
              {stat.value}
            </div>
            <div className="text-sm text-dark-400">{stat.label}</div>

            {/* Hover glow effect */}
            <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${stat.bgGlow} blur-xl -z-10`} />
          </motion.div>
        ))}
      </motion.div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Projects */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="lg:col-span-2 glass-card"
        >
          <div className="flex items-center justify-between p-6 border-b border-dark-700/30">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-500/10 flex items-center justify-center">
                <Activity className="w-4 h-4 text-primary-400" />
              </div>
              <h3 className="font-display font-semibold text-white">Recent Projects</h3>
            </div>
            <Link to="/projects" className="text-sm text-primary-400 hover:text-primary-300 transition-colors">
              View all →
            </Link>
          </div>

          <div className="divide-y divide-dark-700/30">
            {recentProjects?.length > 0 ? (
              recentProjects.map((project: any) => (
                <Link
                  key={project.id}
                  to={`/projects`}
                  className="flex items-center justify-between p-4 hover:bg-dark-800/20 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-dark-800/60 flex items-center justify-center border border-dark-700/30 group-hover:border-primary-500/30 transition-colors">
                      <FolderKanban className="w-5 h-5 text-dark-400 group-hover:text-primary-400 transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white group-hover:text-primary-300 transition-colors">
                        {project.title}
                      </p>
                      <p className="text-xs text-dark-500 font-mono">{project.project_number}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={project.status} />
                    <StatusBadge status={project.priority} />
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center text-dark-400">
                <FolderKanban className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No projects yet. Create your first project to get started.</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-accent-500/10 flex items-center justify-center">
              <Zap className="w-4 h-4 text-accent-400" />
            </div>
            <h3 className="font-display font-semibold text-white">Quick Actions</h3>
          </div>

          <div className="space-y-3">
            {[
              { label: 'New Project', to: '/projects', icon: FolderKanban, color: 'from-primary-500/20 to-primary-600/20 hover:from-primary-500/30 hover:to-primary-600/30 text-primary-400' },
              { label: 'View Clients', to: '/clients', icon: Users, color: 'from-sky-500/20 to-sky-600/20 hover:from-sky-500/30 hover:to-sky-600/30 text-sky-400' },
              { label: 'Quotations', to: '/quotations', icon: Receipt, color: 'from-amber-500/20 to-amber-600/20 hover:from-amber-500/30 hover:to-amber-600/30 text-amber-400' },
              { label: 'Invoices', to: '/invoices', icon: Receipt, color: 'from-emerald-500/20 to-emerald-600/20 hover:from-emerald-500/30 hover:to-emerald-600/30 text-emerald-400' },
              { label: 'Support Tickets', to: '/tickets', icon: TicketCheck, color: 'from-rose-500/20 to-rose-600/20 hover:from-rose-500/30 hover:to-rose-600/30 text-rose-400' },
            ].map((action) => (
              <Link
                key={action.to + action.label}
                to={action.to}
                className={`flex items-center gap-3 px-4 py-3.5 rounded-xl bg-gradient-to-r ${action.color} transition-all duration-300 group`}
              >
                <action.icon className="w-5 h-5" />
                <span className="text-sm font-medium text-white">{action.label}</span>
                <ArrowUpRight className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 rounded-xl bg-dark-800/40 border border-dark-700/30">
            <div className="flex items-center gap-2 mb-3">
              <Target className="w-4 h-4 text-accent-400" />
              <span className="text-sm font-medium text-dark-300">Overview</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-lg font-bold text-white">{stats?.total_clients || 0}</div>
                <div className="text-xs text-dark-400">Clients</div>
              </div>
              <div>
                <div className="text-lg font-bold text-white">{stats?.total_invoices || 0}</div>
                <div className="text-xs text-dark-400">Invoices</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
