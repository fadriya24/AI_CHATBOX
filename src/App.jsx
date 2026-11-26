import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Send,
  Plus,
  Trash2,
  Moon,
  Sun,
  Copy,
  Check,
  Menu,
  X,
  AlertCircle,
  Bot,
  User,
  ArrowRight,
  Code2,
  Lightbulb,
  Mail,
  Zap
} from 'lucide-react';
import './App.css';

// Suggested starter prompts for the welcome screen
const STARTER_PROMPTS = [
  {
    icon: Lightbulb,
    title: 'Explain a Concept',
    prompt: 'Explain quantum computing in simple terms for a beginner.'
  },
  {
    icon: Code2,
    title: 'Write Clean Code',
    prompt: 'Write a clean JavaScript debounce function with clear code comments.'
  },
  {
    icon: Mail,
    title: 'Draft a Professional Email',
    prompt: 'Draft a polite and concise email requesting feedback on a college project.'
  },
  {
    icon: Zap,
    title: 'Brainstorm Ideas',
    prompt: 'Brainstorm 5 innovative tech startup ideas for 2026.'
  }
];

// Helper to safely format AI text into React elements without dangerouslySetInnerHTML
function FormattedMessage({ content }) {
  if (!content) return null;

  // Split into code blocks vs regular prose
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Text before the code block
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        value: content.slice(lastIndex, match.index)
      });
    }

    // The code block itself
    parts.push({
      type: 'code',
      language: match[1] || 'plaintext',
      value: match[2].trimEnd()
    });

    lastIndex = match.index + match[0].length;
  }

  // Trailing text after the last code block
  if (lastIndex < content.length) {
    parts.push({
      type: 'text',
      value: content.slice(lastIndex)
    });
  }

  return (
    <div className="formatted-content">
      {parts.map((part, pIdx) => {
        if (part.type === 'code') {
          return <CodeSnippet key={pIdx} language={part.language} code={part.value} />;
        }

        // Render prose lines
        const lines = part.value.split('\n');
        return (
          <div key={pIdx} className="prose-block">
            {lines.map((line, lIdx) => {
              if (line.trim() === '') {
                return <div key={lIdx} className="line-break" />;
              }

              // Check for bullet list
              if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                return (
                  <div key={lIdx} className="bullet-item">
                    <span className="bullet-dot">•</span>
                    <span>{parseInlineFormatting(line.trim().substring(2))}</span>
                  </div>
                );
              }

              return (
                <p key={lIdx} className="prose-paragraph">
                  {parseInlineFormatting(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// Helper to parse bold (**text**) and inline code (`code`) safely
function parseInlineFormatting(text) {
  const tokens = [];
  // Matches `code` or **bold**
  const regex = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      tokens.push(text.slice(lastIdx, match.index));
    }

    const matched = match[0];
    if (matched.startsWith('`') && matched.endsWith('`')) {
      tokens.push(
        <code key={match.index} className="inline-code">
          {matched.slice(1, -1)}
        </code>
      );
    } else if (matched.startsWith('**') && matched.endsWith('**')) {
      tokens.push(
        <strong key={match.index} className="bold-text">
          {matched.slice(2, -2)}
        </strong>
      );
    }

    lastIdx = match.index + matched.length;
  }

  if (lastIdx < text.length) {
    tokens.push(text.slice(lastIdx));
  }

  return tokens.length > 0 ? tokens : text;
}

// Standalone Code Block with Copy Button
function CodeSnippet({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className="code-container">
      <div className="code-header">
        <span className="code-lang">{language || 'code'}</span>
        <button
          onClick={handleCopy}
          className="code-copy-btn"
          title="Copy code"
          type="button"
        >
          {copied ? (
            <>
              <Check size={14} className="copied-check" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>
      <pre className="code-body">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState(null);

  // Theme management with localStorage persistence
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('nova_theme') || 'light';
  });

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('nova_theme', theme);
  }, [theme]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Submit message to backend
  const sendMessage = async (textToSend) => {
    const messageContent = (textToSend !== undefined ? textToSend : input).trim();

    if (!messageContent || isLoading) return;

    setErrorMessage('');

    // Construct user message object
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      // Call Vercel serverless backend function POST /api/chat
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: messageContent,
          // Format conversation history for context continuity
          history: updatedMessages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            content: msg.content
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server responded with status ${response.status}`);
      }

      // Add AI response to conversation
      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages([...updatedMessages, aiMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setErrorMessage(
        err.message || 'Unable to connect to the Gemini service. Please verify your internet and API configuration.'
      );
    } finally {
      setIsLoading(false);
      // Auto-focus input on desktop
      if (window.innerWidth > 768 && textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Copy message text to clipboard
  const handleCopyMessage = async (msgId, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(msgId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (err) {
      console.error('Failed to copy message:', err);
    }
  };

  // New Chat action
  const handleNewChat = () => {
    setMessages([]);
    setInput('');
    setErrorMessage('');
    setIsSidebarOpen(false);
  };

  // Confirm Clear Chat
  const handleConfirmClear = () => {
    setMessages([]);
    setInput('');
    setErrorMessage('');
    setIsClearModalOpen(false);
    setIsSidebarOpen(false);
  };

  return (
    <div className="chat-app">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isSidebarOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-header">
          <div className="brand-badge">
            <div className="brand-logo">
              <Sparkles size={20} className="brand-sparkle" />
            </div>
            <div>
              <h2 className="brand-title">Nova AI</h2>
              <span className="brand-subtitle">Gemini 1.5 Flash</span>
            </div>
          </div>
          <button
            className="mobile-close-btn"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="sidebar-action">
          <button className="new-chat-btn" onClick={handleNewChat}>
            <Plus size={18} />
            <span>New Chat</span>
          </button>
        </div>

        {/* Chat History / Navigation list */}
        <div className="sidebar-history">
          <div className="history-label">Current Session</div>
          <div className="history-item active">
            <Bot size={16} />
            <span className="history-title">
              {messages.length > 0 ? messages[0].content.slice(0, 24) + '...' : 'Fresh Conversation'}
            </span>
          </div>
        </div>

        {/* Sidebar Footer Controls */}
        <div className="sidebar-footer">
          {messages.length > 0 && (
            <button
              className="footer-btn clear-chat-trigger"
              onClick={() => setIsClearModalOpen(true)}
              title="Clear conversation"
            >
              <Trash2 size={16} />
              <span>Clear Conversation</span>
            </button>
          )}

          <button
            className="footer-btn theme-toggle-btn"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            <span>{theme === 'light' ? 'Dark Theme' : 'Light Theme'}</span>
          </button>

          <div className="project-badge">
            <span className="status-indicator"></span>
            <span>Vercel + Google Gemini</span>
          </div>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="main-content">
        {/* Top App Header */}
        <header className="top-header">
          <div className="header-left">
            <button
              className="menu-toggle-btn"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <Menu size={22} />
            </button>
            <div className="header-title-box">
              <h1 className="header-name">Nova Assistant</h1>
              <span className="model-chip">
                <span className="online-dot"></span>
                gemini-1.5-flash
              </span>
            </div>
          </div>

          <div className="header-actions">
            <button
              className="header-icon-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </button>
            {messages.length > 0 && (
              <button
                className="header-new-btn"
                onClick={handleNewChat}
                title="Start a new chat"
              >
                <Plus size={16} />
                <span>New</span>
              </button>
            )}
          </div>
        </header>

        {/* Messages Scroll Area */}
        <div className="messages-area">
          {messages.length === 0 ? (
            /* Welcome / Empty Screen */
            <div className="welcome-screen">
              <div className="welcome-hero-icon">
                <Sparkles size={36} />
              </div>
              <h2 className="welcome-title">How can I help you today?</h2>
              <p className="welcome-subtitle">
                Powered by Google Gemini 1.5 Flash. Fast, intelligent answers for your questions, projects, and code.
              </p>

              {/* Starter Prompt Cards */}
              <div className="prompts-grid">
                {STARTER_PROMPTS.map((promptItem, idx) => {
                  const Icon = promptItem.icon;
                  return (
                    <button
                      key={idx}
                      className="prompt-card"
                      onClick={() => sendMessage(promptItem.prompt)}
                    >
                      <div className="prompt-card-header">
                        <Icon size={18} className="prompt-card-icon" />
                        <span className="prompt-card-title">{promptItem.title}</span>
                      </div>
                      <p className="prompt-card-text">{promptItem.prompt}</p>
                      <span className="prompt-card-arrow">
                        <ArrowRight size={14} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* Active Message List */
            <div className="messages-container">
              {messages.map(msg => (
                <div key={msg.id} className={`message-row ${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                  </div>

                  <div className="message-bubble-wrapper">
                    <div className="message-bubble">
                      {msg.role === 'user' ? (
                        <p className="user-text">{msg.content}</p>
                      ) : (
                        <FormattedMessage content={msg.content} />
                      )}
                    </div>

                    <div className="message-meta">
                      <span className="message-time">{msg.timestamp}</span>
                      {msg.role === 'assistant' && (
                        <button
                          className="copy-msg-btn"
                          onClick={() => handleCopyMessage(msg.id, msg.content)}
                          title="Copy response"
                        >
                          {copiedMessageId === msg.id ? (
                            <>
                              <Check size={13} className="copied-check" />
                              <span>Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={13} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="message-row assistant">
                  <div className="message-avatar bot-pulse">
                    <Bot size={18} />
                  </div>
                  <div className="message-bubble-wrapper">
                    <div className="message-bubble loading-bubble">
                      <div className="typing-dots">
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                        <span className="typing-dot"></span>
                      </div>
                      <span className="typing-label">Nova is thinking...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="error-alert">
            <AlertCircle size={18} className="error-alert-icon" />
            <span className="error-alert-text">{errorMessage}</span>
            <button
              className="error-dismiss-btn"
              onClick={() => setErrorMessage('')}
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Input Footer */}
        <footer className="chat-footer">
          <form
            className="input-form"
            onSubmit={e => {
              e.preventDefault();
              sendMessage();
            }}
          >
            <div className="input-box">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask Nova anything... (Enter to send, Shift+Enter for newline)"
                rows={1}
                maxLength={2000}
                disabled={isLoading}
                aria-label="Chat input"
              />
              <div className="input-actions">
                <span className="char-count">
                  {input.length > 1500 ? `${input.length}/2000` : ''}
                </span>
                <button
                  type="submit"
                  className="send-button"
                  disabled={!input.trim() || isLoading}
                  aria-label="Send message"
                >
                  <Send size={18} />
                </button>
              </div>
            </div>
          </form>
          <p className="disclaimer-text">
            Nova may occasionally generate inaccurate responses. Please verify important information.
          </p>
        </footer>
      </main>

      {/* Clear Confirmation Modal */}
      {isClearModalOpen && (
        <div className="modal-backdrop">
          <div className="modal-card">
            <div className="modal-header">
              <Trash2 size={24} className="modal-icon" />
              <h3 className="modal-title">Clear conversation?</h3>
            </div>
            <p className="modal-body">
              This will erase all messages in the current conversation. This action cannot be undone.
            </p>
            <div className="modal-actions">
              <button
                className="modal-cancel-btn"
                onClick={() => setIsClearModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="modal-confirm-btn"
                onClick={handleConfirmClear}
              >
                Clear Chat
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
