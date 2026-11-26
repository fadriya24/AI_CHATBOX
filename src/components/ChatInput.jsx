import React from 'react';
import { Send } from 'lucide-react';

export default function ChatInput({
  input,
  onChange,
  onSubmit,
  isLoading,
  textareaRef,
  maxLength = 4000
}) {
  const handleKeyDown = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  const canSend = input.trim().length > 0 && !isLoading;

  return (
    <footer className="chat-footer">
      <form
        className="chat-input-form"
        onSubmit={e => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <div className="chat-input-box">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Nova anything... (Enter to send, Shift + Enter for new line)"
            rows={1}
            maxLength={maxLength}
            disabled={isLoading}
            aria-label="Message input"
          />

          <div className="chat-input-actions">
            {input.length > maxLength - 600 && (
              <span className="char-counter">
                {input.length}/{maxLength}
              </span>
            )}
            <button
              type="submit"
              className="send-btn"
              disabled={!canSend}
              aria-label="Send message"
              title="Send message"
            >
              <Send size={17} />
            </button>
          </div>
        </div>
      </form>
      <p className="footer-note">
        Nova uses Google Gemini via a secure server endpoint. Verify important details.
      </p>
    </footer>
  );
}
