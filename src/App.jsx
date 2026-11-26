import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, RotateCcw, X } from 'lucide-react';
import Sidebar from './components/Sidebar.jsx';
import ChatHeader from './components/ChatHeader.jsx';
import WelcomeScreen from './components/WelcomeScreen.jsx';
import MessageList from './components/MessageList.jsx';
import ChatInput from './components/ChatInput.jsx';
import ConfirmModal from './components/ConfirmModal.jsx';
import './App.css';

const STORAGE_KEYS = {
  theme: 'nova_theme_v1',
  conversations: 'nova_conversations_v1',
  activeId: 'nova_active_chat_id_v1'
};

function createNewConversation() {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: 'New Chat',
    messages: []
  };
}

function formatTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function buildTitleFromMessage(text) {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > 32 ? `${clean.slice(0, 32)}...` : clean;
}

function loadInitialConversations() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.conversations);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not load saved conversations:', err);
  }
  return [createNewConversation()];
}

export default function App() {
  const [conversations, setConversations] = useState(loadInitialConversations);
  const [activeChatId, setActiveChatId] = useState(() => {
    const savedId = localStorage.getItem(STORAGE_KEYS.activeId);
    return savedId || '';
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.theme) || 'light';
  });

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Ensure activeChatId always points to an existing conversation
  const activeConversation =
    conversations.find(chat => chat.id === activeChatId) || conversations[0];
  const resolvedActiveId = activeConversation.id;
  const messages = activeConversation.messages;

  useEffect(() => {
    if (resolvedActiveId !== activeChatId) {
      setActiveChatId(resolvedActiveId);
    }
  }, [resolvedActiveId, activeChatId]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.conversations, JSON.stringify(conversations));
      localStorage.setItem(STORAGE_KEYS.activeId, resolvedActiveId);
    } catch (err) {
      console.warn('Could not persist conversations:', err);
    }
  }, [conversations, resolvedActiveId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isLoading, resolvedActiveId]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
  }, [input]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  const requestGeminiReply = async (targetChatId, promptText, priorMessages) => {
    setIsLoading(true);
    setErrorInfo(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptText,
          history: priorMessages.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            content: msg.content
          }))
        })
      });

      const contentType = response.headers.get('content-type') || '';
      let data = {};
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(
          response.status === 404
            ? 'API endpoint /api/chat was not found. Make sure you run the app with "npm run dev" or "vercel dev".'
            : text || `Server returned an unexpected response (${response.status}).`
        );
      }

      if (!response.ok) {
        throw new Error(data.error || `Request failed with status ${response.status}.`);
      }

      if (!data.reply || typeof data.reply !== 'string') {
        throw new Error('Received an invalid response format from the server.');
      }

      const aiMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role: 'assistant',
        content: data.reply,
        timestamp: formatTime()
      };

      setConversations(prev =>
        prev.map(chat =>
          chat.id === targetChatId
            ? { ...chat, messages: [...chat.messages, aiMessage] }
            : chat
        )
      );
    } catch (err) {
      console.error('Chat request error:', err);
      setErrorInfo({
        message:
          err.message ||
          'Unable to reach the AI server. Check your internet connection and API configuration.',
        chatId: targetChatId,
        promptText,
        priorMessages
      });
    } finally {
      setIsLoading(false);
      if (window.innerWidth > 768) {
        setTimeout(() => textareaRef.current?.focus(), 0);
      }
    }
  };

  const handleSend = async overrideText => {
    const promptText = (overrideText !== undefined ? overrideText : input).trim();
    if (!promptText || isLoading) return;

    const targetChatId = resolvedActiveId;
    const priorMessages = messages;

    const userMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: 'user',
      content: promptText,
      timestamp: formatTime()
    };

    setConversations(prev =>
      prev.map(chat => {
        if (chat.id !== targetChatId) return chat;
        const isFirstMessage = chat.messages.length === 0;
        return {
          ...chat,
          title: isFirstMessage ? buildTitleFromMessage(promptText) : chat.title,
          messages: [...chat.messages, userMessage]
        };
      })
    );

    if (overrideText === undefined) {
      setInput('');
    }

    await requestGeminiReply(targetChatId, promptText, priorMessages);
  };

  const handleRetry = async () => {
    if (!errorInfo || isLoading) return;
    await requestGeminiReply(
      errorInfo.chatId,
      errorInfo.promptText,
      errorInfo.priorMessages
    );
  };

  const handleNewChat = () => {
    if (isLoading) return;

    const existingEmpty = conversations.find(chat => chat.messages.length === 0);
    if (existingEmpty) {
      setActiveChatId(existingEmpty.id);
    } else {
      const freshChat = createNewConversation();
      setConversations(prev => [freshChat, ...prev]);
      setActiveChatId(freshChat.id);
    }

    setInput('');
    setErrorInfo(null);
    setIsSidebarOpen(false);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  const handleSelectChat = chatId => {
    if (isLoading) return;
    setActiveChatId(chatId);
    setErrorInfo(null);
    setIsSidebarOpen(false);
  };

  const handleDeleteChat = chatId => {
    if (isLoading) return;
    setConversations(prev => {
      const remaining = prev.filter(chat => chat.id !== chatId);
      if (remaining.length === 0) {
        const fresh = createNewConversation();
        setActiveChatId(fresh.id);
        return [fresh];
      }
      if (chatId === resolvedActiveId) {
        setActiveChatId(remaining[0].id);
      }
      return remaining;
    });
    setErrorInfo(null);
  };

  const handleConfirmClear = () => {
    setConversations(prev =>
      prev.map(chat =>
        chat.id === resolvedActiveId
          ? { ...chat, title: 'New Chat', messages: [] }
          : chat
      )
    );
    setInput('');
    setErrorInfo(null);
    setIsClearModalOpen(false);
    setIsSidebarOpen(false);
  };

  return (
    <div className="chat-app">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        conversations={conversations}
        activeChatId={resolvedActiveId}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onDeleteChat={handleDeleteChat}
        onRequestClearCurrent={() => setIsClearModalOpen(true)}
        hasActiveMessages={messages.length > 0}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className="chat-main">
        <ChatHeader
          theme={theme}
          onToggleTheme={toggleTheme}
          onOpenSidebar={() => setIsSidebarOpen(true)}
          onNewChat={handleNewChat}
          onRequestClear={() => setIsClearModalOpen(true)}
          hasMessages={messages.length > 0}
          isLoading={isLoading}
        />

        <div className="chat-scroll-area">
          {messages.length === 0 ? (
            <WelcomeScreen onSelectPrompt={prompt => handleSend(prompt)} />
          ) : (
            <MessageList
              messages={messages}
              isLoading={isLoading}
              messagesEndRef={messagesEndRef}
            />
          )}
        </div>

        {errorInfo && (
          <div className="error-banner" role="alert">
            <AlertCircle size={18} className="error-icon" />
            <span className="error-text">{errorInfo.message}</span>
            <button
              type="button"
              className="error-retry-btn"
              onClick={handleRetry}
              disabled={isLoading}
            >
              <RotateCcw size={14} />
              <span>Retry</span>
            </button>
            <button
              type="button"
              className="error-dismiss-btn"
              onClick={() => setErrorInfo(null)}
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <ChatInput
          input={input}
          onChange={setInput}
          onSubmit={() => handleSend()}
          isLoading={isLoading}
          textareaRef={textareaRef}
        />
      </main>

      <ConfirmModal
        isOpen={isClearModalOpen}
        title="Clear this conversation?"
        message="This will remove all messages from the current chat. You cannot undo this action."
        confirmLabel="Clear Chat"
        onCancel={() => setIsClearModalOpen(false)}
        onConfirm={handleConfirmClear}
      />
    </div>
  );
}
