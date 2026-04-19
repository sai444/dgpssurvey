import { motion } from 'framer-motion'
import { Loader2 } from 'lucide-react'

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-12">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-2 border-dark-700 border-t-primary-500 animate-spin" />
        <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-b-accent-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
      </div>
    </div>
  )
}

export function EmptyState({ title, description, icon: Icon, action }: {
  title: string
  description: string
  icon: any
  action?: React.ReactNode
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-dark-800/60 flex items-center justify-center mb-4 border border-dark-700/50">
        <Icon className="w-8 h-8 text-dark-400" />
      </div>
      <h3 className="text-lg font-semibold text-dark-200 mb-2">{title}</h3>
      <p className="text-sm text-dark-400 max-w-sm mb-6">{description}</p>
      {action}
    </motion.div>
  )
}

export function PageTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <motion.h1
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="text-2xl md:text-3xl font-display font-bold text-white"
      >
        {title}
      </motion.h1>
      {subtitle && (
        <p className="text-sm text-dark-400 mt-1">{subtitle}</p>
      )}
    </div>
  )
}
