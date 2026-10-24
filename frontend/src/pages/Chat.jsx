import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { api } from '../api.js';

const hello = { role: 'bot', text: 'Hi! Ask me to find books, check availability or reserve one. Try: "Suggest beginner books on machine learning".' };

export default function Chat() {
  const [messages, setMessages] = useState([hello]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottom = useRef(null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, loading]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const data = await api('/chat', { method: 'POST', body: { message: text } });
      setMessages((m) => [...m, { role: 'bot', text: data.answer, books: data.books, traceId: data.traceId }]);
    } catch (err) {
      setMessages((m) => [...m, { role: 'bot', text: '⚠️ ' + err.message }]);
    }
    setLoading(false);
  };

  const newChat = async () => {
    await api('/chat', { method: 'DELETE' });
    setMessages([hello]);
  };

  return (
    <div className="chat">
      <div className="chat-top"><button onClick={newChat}>New chat</button></div>
      <div className="messages">
        {messages.map((m, i) => (
          <div key={i} className={`bubble ${m.role}`}>
            <ReactMarkdown>{m.text}</ReactMarkdown>
            {m.books?.length > 0 && (
              <div className="cards">
                {m.books.map((b) => (
                  <div className="card" key={b.bookId}>
                    <b>{b.title}</b>
                    <span>{b.authors}</span>
                    <span className="tag">{b.level} · match {b.relevance}</span>
                  </div>
                ))}
              </div>
            )}
            {m.traceId && <small className="trace">trace: {m.traceId}</small>}
          </div>
        ))}
        {loading && <div className="bubble bot">Thinking…</div>}
        <div ref={bottom} />
      </div>
      <form className="input-row" onSubmit={send}>
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about books…" maxLength={500} />
        <button type="submit" disabled={loading}>Send</button>
      </form>
    </div>
  );
}