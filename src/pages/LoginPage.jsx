import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-950 flex items-center justify-center z-[9999]">
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-2xl dark:shadow-black/50 p-10 w-[380px] max-w-[90vw] border border-border dark:border-slate-700 animate-fadeIn">
        <div className="text-center mb-8">
          <div className="text-3xl font-extrabold tracking-tight">
            <span className="text-primary">Decor</span><span className="text-destructive">City</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">Frame Workshop &amp; Art Studio</div>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-destructive dark:text-red-400 p-2.5 rounded-lg text-xs mb-4">{error}</div>
        )}

        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            placeholder="admin@example.com"
            required
          />
        </div>
        <div className="mb-5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-border dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
            placeholder="Enter password"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 rounded-xl bg-primary hover:bg-primary/90 disabled:bg-primary/60 text-white font-semibold text-sm transition-all active:scale-[0.98] cursor-pointer border-0"
        >
          {loading ? 'Signing in...' : 'Login'}
        </button>
      </form>
    </div>
  )
}
