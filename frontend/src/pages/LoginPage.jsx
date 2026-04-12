import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const from = location.state?.from?.pathname || '/'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await login(form)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div className="card" style={{ maxWidth: 520, margin: '40px auto' }}>
        <h2>Login</h2>
        <p>Sign in to continue as entrepreneur, investor, or admin.</p>

        <form className="form-grid" style={{ marginTop: 20 }} onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="you@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="Enter your password"
              required
            />
          </label>

          {error && <p style={{ color: '#f87171' }}>{error}</p>}

          <button type="submit" className="button-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <p style={{ marginTop: 16, color: '#cbd5e1' }}>
          No account yet? <Link to="/register">Register here</Link>
        </p>
        <p style={{ marginTop: 8, color: '#94a3b8', fontSize: '0.92rem' }}>
          Demo admin: admin@msme.local / admin123
        </p>
      </div>
    </section>
  )
}
