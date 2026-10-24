import { useState } from 'react';
import Login from './pages/Login.jsx';
import Chat from './pages/Chat.jsx';


export default function App() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null'));
  const [page, setPage] = useState('chat');

  const onLogin = (data) => {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
    setUser(data.user);
    setPage('chat');
  };
  const logout = () => { localStorage.clear(); setUser(null); };

  if (!user) return <Login onLogin={onLogin} />;

  return (
    <div className="app">
      <header>
        <h1>📚 Smart Library</h1>
        <nav>
          <button className={page === 'chat' ? 'active' : ''} onClick={() => setPage('chat')}>Assistant</button>
          {user.role === 'librarian' && (
            <button className={page === 'dashboard' ? 'active' : ''} onClick={() => setPage('dashboard')}>Dashboard</button>
          )}
          <span className="who">{user.name} ({user.role})</span>
          <button onClick={logout}>Logout</button>
        </nav>
      </header>
      {page === 'chat' ? <Chat /> : <Dashboard />}
    </div>
  );
}