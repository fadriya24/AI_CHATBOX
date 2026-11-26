import React, { useState } from 'react';
import { Check, Copy } from 'lucide-react';

async function copyTextToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}

function CodeBlock({ language, code }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await copyTextToClipboard(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (err) {
      console.error('Failed to copy code block:', err);
    }
  };

  return (
    <div className="code-block">
      <div className="code-block-header">
        <span className="code-block-lang">{language || 'code'}</span>
        <button
          type="button"
          className="code-copy-btn"
          onClick={handleCopy}
          aria-label="Copy code snippet"
        >
          {copied ? (
            <>
              <Check size={14} className="icon-success" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="code-block-pre">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function renderInline(text) {
  const tokens = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${match.index}-${token.length}`;

    if (token.startsWith('`') && token.endsWith('`')) {
      tokens.push(
        <code key={key} className="inline-code">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      tokens.push(
        <strong key={key} className="prose-strong">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      tokens.push(
        <em key={key} className="prose-em">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith('[')) {
      const linkMatch = token.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        tokens.push(
          <a
            key={key}
            href={linkMatch[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="prose-link"
          >
            {linkMatch[1]}
          </a>
        );
      } else {
        tokens.push(token);
      }
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex));
  }

  return tokens.length > 0 ? tokens : text;
}

function renderProseSegment(text, segmentKey) {
  const lines = text.split('\n');

  return (
    <div key={segmentKey} className="prose-block">
      {lines.map((rawLine, index) => {
        const trimmed = rawLine.trim();
        const lineKey = `${segmentKey}-${index}`;

        if (!trimmed) {
          return <div key={lineKey} className="prose-spacer" />;
        }

        const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          return (
            <div key={lineKey} className={`prose-heading prose-h${level}`}>
              {renderInline(headingMatch[2])}
            </div>
          );
        }

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={lineKey} className="prose-list-item">
              <span className="prose-bullet" aria-hidden="true">
                •
              </span>
              <span>{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }

        const orderedMatch = trimmed.match(/^(\d+\.)\s+(.+)$/);
        if (orderedMatch) {
          return (
            <div key={lineKey} className="prose-list-item">
              <span className="prose-order-num">{orderedMatch[1]}</span>
              <span>{renderInline(orderedMatch[2])}</span>
            </div>
          );
        }

        return (
          <p key={lineKey} className="prose-paragraph">
            {renderInline(rawLine)}
          </p>
        );
      })}
    </div>
  );
}

export default function FormattedMessage({ content }) {
  if (!content) return null;

  const segments = [];
  const codeBlockPattern = /```([a-zA-Z0-9_+-]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockPattern.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        value: content.slice(lastIndex, match.index)
      });
    }

    segments.push({
      type: 'code',
      language: match[1] || 'plaintext',
      value: match[2].replace(/\n$/, '')
    });

    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      value: content.slice(lastIndex)
    });
  }

  return (
    <div className="formatted-message">
      {segments.map((segment, idx) =>
        segment.type === 'code' ? (
          <CodeBlock key={idx} language={segment.language} code={segment.value} />
        ) : (
          renderProseSegment(segment.value, idx)
        )
      )}
    </div>
  );
}

export { copyTextToClipboard };
