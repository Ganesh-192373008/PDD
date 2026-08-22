import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Send, Trash2, Sprout, Bot, User, AlertTriangle } from 'lucide-react';

export const AIChat = () => {
  const { t, token, API_URL } = useApp();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null); // { message, detail }
  
  const chatEndRef = useRef(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    const savedChat = localStorage.getItem('agroassist_chat_history');
    if (savedChat) {
      try {
        setMessages(JSON.parse(savedChat));
      } catch (e) {
        console.error('Error parsing saved chat:', e);
      }
    } else {
      // Default welcome message
      setMessages([
        {
          role: 'assistant',
          content: 'Hello! I am your AgroAssist AI Farming Assistant. Ask me anything about crop diseases, care, soil, fertilizers, irrigation, pests, planting, or government schemes.'
        }
      ]);
    }
  }, []);

  // Save chat history to localStorage on updates
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('agroassist_chat_history', JSON.stringify(messages));
    }
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    setErrorInfo(null);
    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const chatHistory = [...messages, userMessage];
      const res = await fetch(`${API_URL}/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ messages: chatHistory }),
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.content }]);
      } else {
        // Handle Ollama offline or error status
        setErrorInfo({
          message: data.message || 'Error communicating with AI Assistant.',
          detail: data.detail || 'The backend was unable to get a valid response from the Ollama model.'
        });
      }
    } catch (e) {
      setErrorInfo({
        message: 'Network error contacting AI service.',
        detail: 'Please check that the backend server is running and accessible.'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear your conversation history?')) {
      setMessages([
        {
          role: 'assistant',
          content: 'Hello! I am your AgroAssist AI Farming Assistant. Ask me anything about crop diseases, care, soil, fertilizers, irrigation, pests, planting, or government schemes.'
        }
      ]);
      localStorage.removeItem('agroassist_chat_history');
      setErrorInfo(null);
    }
  };

  return (
    <div className="chat-wrapper slide-in">
      <div className="glass-card chat-container">
        {/* Chat Header */}
        <header className="chat-header">
          <div className="chat-title">
            <Sprout color="#81c784" size={28} />
            <div>
              <h2>AI Farming Assistant</h2>
              <p className="online-indicator">Powered by Ollama Local LLM</p>
            </div>
          </div>
          <button onClick={handleClear} className="btn btn-outline btn-icon" title="Clear Chat">
            <Trash2 size={18} color="#e57373" />
          </button>
        </header>

        {/* Messages Body */}
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`message-bubble ${msg.role}`}>
              <div className="avatar-circle">
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className="message-content">
                <p>{msg.content}</p>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="message-bubble assistant loading">
              <div className="avatar-circle">
                <Bot size={16} />
              </div>
              <div className="message-content">
                <div className="typing-dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          {errorInfo && (
            <div className="alert alert-error chat-alert">
              <div className="alert-title">
                <AlertTriangle size={18} />
                <strong>{errorInfo.message}</strong>
              </div>
              <p className="alert-detail">{errorInfo.detail}</p>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input Footer */}
        <form onSubmit={handleSend} className="chat-input-form">
          <input
            type="text"
            className="input-field chat-input"
            placeholder="Ask about crop protection, watering frequency, pests, or fertilizer schedules..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            required
          />
          <button type="submit" className="btn btn-primary btn-chat-send" disabled={loading}>
            <Send size={18} />
          </button>
        </form>
      </div>

      <style>{`
        .chat-wrapper {
          height: calc(100vh - 80px);
          display: flex;
          flex-direction: column;
        }
        .chat-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          height: 100%;
          padding: 0;
          overflow: hidden;
        }
        .chat-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-color);
          background: rgba(0, 0, 0, 0.2);
        }
        .chat-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .chat-title h2 {
          font-size: 18px;
          margin: 0;
        }
        .online-indicator {
          font-size: 12px;
          color: #81c784;
          margin: 0;
        }
        .btn-icon {
          padding: 10px;
          border-radius: 50%;
        }
        
        /* Chat Messages Body */
        .chat-messages {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          background: rgba(0, 0, 0, 0.15);
        }
        .message-bubble {
          display: flex;
          gap: 12px;
          max-width: 80%;
          animation: slideIn 0.3s ease-out;
        }
        .message-bubble.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }
        .message-bubble.assistant {
          align-self: flex-start;
        }
        .avatar-circle {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .user .avatar-circle {
          background: var(--secondary-color);
          color: black;
        }
        .assistant .avatar-circle {
          background: var(--primary-color);
          color: white;
        }
        .message-content {
          padding: 12px 16px;
          border-radius: var(--border-radius-md);
          font-size: 15px;
          line-height: 1.5;
        }
        .user .message-content {
          background: var(--primary-color);
          color: white;
          border-top-right-radius: 0;
        }
        .assistant .message-content {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          border-top-left-radius: 0;
          white-space: pre-line; /* preserves formatting and newlines */
        }
        
        /* Typing Dots */
        .typing-dots {
          display: flex;
          gap: 4px;
          padding: 4px 0;
        }
        .typing-dots span {
          width: 8px;
          height: 8px;
          background: var(--text-secondary);
          border-radius: 50%;
          animation: bounce 1.4s infinite ease-in-out both;
        }
        .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
        .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }

        /* Error/Offline Alerts */
        .chat-alert {
          align-self: center;
          width: 100%;
          max-width: 600px;
          margin-top: 10px;
        }
        .alert-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
        }
        .alert-detail {
          font-size: 13px;
          opacity: 0.9;
        }

        /* Input Form */
        .chat-input-form {
          display: flex;
          gap: 12px;
          padding: 20px 24px;
          background: rgba(0, 0, 0, 0.2);
          border-top: 1px solid var(--border-color);
        }
        .chat-input {
          flex: 1;
          margin-bottom: 0;
          border-radius: var(--border-radius-lg);
        }
        .btn-chat-send {
          border-radius: 50%;
          width: 48px;
          height: 48px;
          padding: 0;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .chat-wrapper {
            height: calc(100vh - 120px);
          }
          .message-bubble {
            max-width: 95%;
          }
        }
      `}</style>
    </div>
  );
};
