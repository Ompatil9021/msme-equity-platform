import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../AuthContext'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'entrepreneur',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      await register(form)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <div className="card" style={{ maxWidth: 560, margin: '40px auto' }}>
        <h2>Create account</h2>
        <p>Choose your role to unlock the right platform pages.</p>

        <form className="form-grid" style={{ marginTop: 20 }} onSubmit={handleSubmit}>
          <label>
            Full name
            <input
              type="text"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Your full name"
              required
            />
          </label>

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
              placeholder="Minimum 4 characters"
              required
            />
          </label>

          <label>
            Register as
            <select
              value={form.role}
              onChange={(event) => setForm((prev) => ({ ...prev, role: event.target.value }))}
            >
              <option value="entrepreneur">Entrepreneur</option>
              <option value="investor">Investor</option>
              <option value="admin">Admin</option>
            </select>
          </label>

          {error && <p style={{ color: '#f87171' }}>{error}</p>}

          <button type="submit" className="button-primary" disabled={loading}>
            {loading ? 'Creating account...' : 'Register'}
          </button>
        </form>

        <p style={{ marginTop: 16, color: '#cbd5e1' }}>
          Already registered? <Link to="/login">Login</Link>
        </p>
      </div>
    </section>
  )
}
