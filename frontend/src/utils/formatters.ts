export function formatCurrency(amount: number | undefined | null): string {
  if (amount == null) return '₹0.00'
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: string | undefined | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | undefined | null): string {
  if (!date) return '—'
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function getStatusColor(status: string): string {
  const map: Record<string, string> = {
    draft: 'badge-default',
    quoted: 'badge-info',
    approved: 'badge-success',
    in_progress: 'badge-warning',
    completed: 'badge-success',
    on_hold: 'badge-warning',
    cancelled: 'badge-danger',
    sent: 'badge-info',
    accepted: 'badge-success',
    rejected: 'badge-danger',
    expired: 'badge-danger',
    paid: 'badge-success',
    partial: 'badge-warning',
    overdue: 'badge-danger',
    open: 'badge-info',
    resolved: 'badge-success',
    closed: 'badge-default',
    low: 'badge-default',
    medium: 'badge-info',
    high: 'badge-warning',
    urgent: 'badge-danger',
  }
  return map[status] || 'badge-default'
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
