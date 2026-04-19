import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Satellite, ArrowRight, Loader2 } from 'lucide-react'
import { authApi } from '@/api'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login } = useAuthStore()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data } = await authApi.login(email, password)
      login(data.user, data.access_token, data.refresh_token)
      toast.success(`Welcome back, ${data.user.full_name}!`)
      navigate('/dashboard')
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-dark-900">
        {/* Animated background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-500/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }} />
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '1.5s' }} />
        </div>

        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px'
        }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="flex items-center gap-3 mb-8">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow-lg">
                <Satellite className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-display font-bold gradient-text">DGPS Survey</h2>
                <p className="text-xs text-dark-400 tracking-[0.2em] uppercase">Management System</p>
              </div>
            </div>

            <h1 className="text-4xl xl:text-5xl font-display font-bold text-white leading-tight mb-6">
              Precision Survey<br />
              <span className="gradient-text">Management Platform</span>
            </h1>

            <p className="text-dark-400 text-lg max-w-md leading-relaxed mb-10">
              Streamline your DGPS survey operations with intelligent project tracking,
              automated billing, and real-time collaboration.
            </p>

            {/* Features */}
            <div className="space-y-4">
              {[
                'AutoCAD file visualization & map rendering',
                'Automated quotation & invoice generation',
                'Real-time project tracking & analytics',
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + i * 0.2 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-2 h-2 rounded-full bg-gradient-to-r from-primary-500 to-accent-500" />
                  <span className="text-dark-300 text-sm">{feature}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-6 md:p-12 bg-dark-950">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
              <Satellite className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-display font-bold gradient-text">DGPS Survey</h2>
              <p className="text-[10px] text-dark-400 tracking-[0.2em] uppercase">Management</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-display font-bold text-white mb-2">Welcome back</h2>
            <p className="text-dark-400">Sign in to your account to continue</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Email address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@dgpssurvey.com"
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-300 mb-2">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="input-field pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-dark-400 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded bg-dark-800 border-dark-600 text-primary-500 focus:ring-primary-500/20" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-primary-400 hover:text-primary-300 transition-colors">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-dark-400 text-sm mt-8">
            Don't have an account?{' '}
            <Link to="/signup" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
              Create account
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
