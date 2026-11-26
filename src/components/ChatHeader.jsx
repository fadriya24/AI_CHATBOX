import React from 'react';
import { Menu, Moon, Sun, Plus, Trash2 } from 'lucide-react';

export default function ChatHeader({
  theme,
  onToggleTheme,
  onOpenSidebar,
  onNewChat,
  onRequestClear,
  hasMessages,
  isLoading
}) {
  return (
    <header className="top-header">
      <div className="header-left">
        <button
          type="button"
          className="icon-btn mobile-menu-btn"
          onClick={onOpenSidebar}
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="header-title-group">
          <h1 className="header-title">Nova AI</h1>
          <span className="status-pill">
            <span className={`status-dot ${isLoading ? 'busy' : ''}`} />
            {isLoading ? 'Thinking...' : 'Gemini Ready'}
          </span>
        </div>
      </div>

      <div className="header-right">
        <button
          type="button"
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {hasMessages && (
          <>
            <button
              type="button"
              className="icon-btn danger-hover"
              onClick={onRequestClear}
              aria-label="Clear current chat"
              title="Clear current chat"
            >
              <Trash2 size={18} />
            </button>

            <button
              type="button"
              className="header-new-chat-btn"
              onClick={onNewChat}
              title="Start a new chat"
            >
              <Plus size={16} />
              <span>New Chat</span>
            </button>
          </>
        )}
      </div>
    </header>
  );
}
