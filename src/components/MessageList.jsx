import React, { useState } from 'react';
import { Bot, User, Copy, Check } from 'lucide-react';
import FormattedMessage, { copyTextToClipboard } from './FormattedMessage.jsx';

export default function MessageList({ messages, isLoading, messagesEndRef }) {
  const [copiedId, setCopiedId] = useState(null);

  const handleCopy = async (id, text) => {
    try {
      await copyTextToClipboard(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (err) {
      console.error('Failed to copy response:', err);
    }
  };

  return (
    <div className="messages-container" role="log" aria-live="polite">
      {messages.map(msg => {
        const isUser = msg.role === 'user';
        return (
          <div key={msg.id} className={`message-row ${isUser ? 'user' : 'assistant'}`}>
            <div className="message-avatar" aria-hidden="true">
              {isUser ? <User size={17} /> : <Bot size={17} />}
            </div>

            <div className="message-content-col">
              <div className="message-bubble">
                {isUser ? (
                  <p className="user-message-text">{msg.content}</p>
                ) : (
                  <FormattedMessage content={msg.content} />
                )}
              </div>

              <div className="message-meta">
                <span className="message-time">{msg.timestamp}</span>
                {!isUser && (
                  <button
                    type="button"
                    className="copy-response-btn"
                    onClick={() => handleCopy(msg.id, msg.content)}
                    aria-label="Copy AI response"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <Check size={13} className="icon-success" />
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
        );
      })}

      {isLoading && (
        <div className="message-row assistant" aria-label="Nova is thinking">
          <div className="message-avatar avatar-thinking" aria-hidden="true">
            <Bot size={17} />
          </div>
          <div className="message-content-col">
            <div className="message-bubble loading-bubble">
              <div className="typing-dots" aria-hidden="true">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
              <span className="typing-text">Nova is thinking...</span>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>
  );
}
