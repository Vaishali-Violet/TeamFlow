import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { chatApi } from '../api';
import { MessageSquare, Send } from 'lucide-react';

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  userName: string;
  userAvatar?: string;
}

const ChatPage = () => {
  const { user, currentWorkspace } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = () => {
    if (!currentWorkspace) return;
    chatApi.listByWorkspace(currentWorkspace.id)
      .then(setMessages)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  // Initial load and polling every 3 seconds for live chat
  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [currentWorkspace]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !input.trim()) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    try {
      const msg = await chatApi.send(currentWorkspace.id, text);
      setMessages(prev => [...prev, msg]);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="loading-state">Loading team chat…</div>;
  }

  return (
    <div className="flex flex-col gap-4 w-full" style={{ minHeight: 'calc(100vh - 170px)', height: '100%' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquare size={22} className="text-primary" /> Live Team Chat
          </h2>
          <p className="text-sm text-secondary">Collaborate in real-time with team members of {currentWorkspace?.name}</p>
        </div>
      </div>

      {/* Chat Container */}
      <div className="glass-panel flex flex-col flex-1" style={{ borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {/* Messages List */}
        <div className="chat-messages-container flex-1 p-4 flex flex-col gap-3" style={{ overflowY: 'auto' }}>
          {messages.length === 0 ? (
            <div className="empty-state my-auto">
              <MessageSquare size={36} className="text-muted mb-2" />
              <p className="text-sm text-muted">No messages yet. Say hello to your team!</p>
            </div>
          ) : (
            messages.map(msg => {
              const isMe = msg.userId === user?.id;

              return (
                <div
                  key={msg.id}
                  className={`chat-message-row ${isMe ? 'mine' : 'other'}`}
                >
                  {!isMe && (
                    <div className="avatar-circle" style={{ width: '32px', height: '32px', fontSize: '0.85rem' }}>
                      {msg.userName[0]}
                    </div>
                  )}
                  <div className="chat-bubble-container">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-secondary">{isMe ? 'You' : msg.userName}</span>
                      <span className="text-xs text-muted">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`chat-bubble ${isMe ? 'chat-bubble-mine' : 'chat-bubble-other'}`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input Box */}
        <form onSubmit={handleSend} className="chat-input-bar p-3 glass-card flex items-center gap-2" style={{ borderRadius: 0, borderTop: '1px solid var(--glass-border)' }}>
          <input
            type="text"
            className="form-input flex-1"
            placeholder="Type your message…"
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button type="submit" className="btn btn-primary" disabled={sending || !input.trim()}>
            <Send size={16} /> Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPage;
