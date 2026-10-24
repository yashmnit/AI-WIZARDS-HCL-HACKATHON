import { useState } from 'react';
import { api } from '../api.js';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      onLogin(await api(`/auth/${mode}`, { method: 'POST', body: form }));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login">
      <form onSubmit={submit}>
        <h2>📚 Smart Library Assistant</h2>
        {mode === 'register' && <input placeholder="Name" value={form.name} onChange={set('name')} />}
        <input placeholder="Email" value={form.email} onChange={set('email')} />
        <input placeholder="Password" type="password" value={form.password} onChange={set('password')} />
        {error && <p className="error">{error}</p>}
        <button type="submit">{mode === 'login' ? 'Login' : 'Create account'}</button>
        <p className="switch" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'New here? Register' : 'Have an account? Login'}
        </p>
      </form>
    </div>
  );
}