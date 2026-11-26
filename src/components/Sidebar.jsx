import React from 'react';
import { Sparkles, Plus, MessageSquare, Trash2, Moon, Sun, X } from 'lucide-react';

export default function Sidebar({
  isOpen,
  onClose,
  conversations,
  activeChatId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onRequestClearCurrent,
  hasActiveMessages,
  theme,
  onToggleTheme
}) {
  return (
    <>
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`} aria-label="Chat navigation">
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-icon" aria-hidden="true">
              <Sparkles size={19} />
            </div>
            <div className="brand-text">
              <span className="brand-name">Nova AI</span>
              <span className="brand-tag">Google Gemini</span>
            </div>
          </div>

          <button
            type="button"
            className="icon-btn sidebar-close-btn"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <button type="button" className="new-chat-btn" onClick={onNewChat}>
          <Plus size={18} />
          <span>New Chat</span>
        </button>

        <div className="sidebar-section-label">Conversations</div>

        <nav className="history-list" aria-label="Saved conversations">
          {conversations.map(chat => {
            const isActive = chat.id === activeChatId;
            return (
              <div
                key={chat.id}
                className={`history-row ${isActive ? 'active' : ''}`}
              >
                <button
                  type="button"
                  className="history-select-btn"
                  onClick={() => onSelectChat(chat.id)}
                  title={chat.title}
                >
                  <MessageSquare size={15} className="history-icon" />
                  <span className="history-title">{chat.title}</span>
                </button>

                {conversations.length > 1 || chat.messages.length > 0 ? (
                  <button
                    type="button"
                    className="history-delete-btn"
                    onClick={e => {
                      e.stopPropagation();
                      onDeleteChat(chat.id);
                    }}
                    aria-label={`Delete ${chat.title}`}
                    title="Delete chat"
                  >
                    <Trash2 size={14} />
                  </button>
                ) : null}
              </div>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          {hasActiveMessages && (
            <button
              type="button"
              className="sidebar-footer-btn clear-btn"
              onClick={onRequestClearCurrent}
            >
              <Trash2 size={16} />
              <span>Clear Current Chat</span>
            </button>
          )}

          <button
            type="button"
            className="sidebar-footer-btn"
            onClick={onToggleTheme}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
          </button>

          <div className="sidebar-security-note">
            <span className="security-dot" />
            <span>Protected by Server API</span>
          </div>
        </div>
      </aside>
    </>
  );
}
