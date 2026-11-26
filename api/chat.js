/**
 * Vercel Serverless Function: POST /api/chat
 * Securely proxies chat requests to the official Google Gemini REST API.
 * GEMINI_API_KEY is read strictly from server environment variables.
 */

const DEFAULT_MODEL = 'gemini-flash-latest';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_ITEMS = 16;

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  const recent = history.slice(-MAX_HISTORY_ITEMS);
  const contents = [];

  for (const item of recent) {
    if (!item || typeof item.content !== 'string') continue;
    const text = item.content.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!text) continue;

    const role = item.role === 'assistant' || item.role === 'model' ? 'model' : 'user';

    // Gemini requires conversation history to start with a user turn
    if (contents.length === 0 && role === 'model') {
      continue;
    }

    const prev = contents[contents.length - 1];
    if (prev && prev.role === role) {
      prev.parts[0].text += `\n\n${text}`;
    } else {
      contents.push({
        role,
        parts: [{ text }]
      });
    }
  }

  return contents;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed. Please send a POST request to /api/chat.'
    });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    return res.status(500).json({
      error:
        'GEMINI_API_KEY is not configured on the server. Add it to .env.local for local testing or in your Vercel Project Environment Variables.'
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON request body.' });
    }
  }

  const { message, history } = body || {};

  if (typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      error: 'Please enter a non-empty message before sending.'
    });
  }

  const trimmedMessage = message.trim();
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: `Message is too long. Maximum allowed length is ${MAX_MESSAGE_LENGTH.toLocaleString()} characters.`
    });
  }

  const contents = normalizeHistory(history);
  const lastTurn = contents[contents.length - 1];

  if (lastTurn && lastTurn.role === 'user') {
    lastTurn.parts[0].text += `\n\n${trimmedMessage}`;
  } else {
    contents.push({
      role: 'user',
      parts: [{ text: trimmedMessage }]
    });
  }

  const model = (process.env.GEMINI_MODEL || DEFAULT_MODEL).trim();
  const endpoint = `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`;

  const payload = {
    contents,
    systemInstruction: {
      parts: [
        {
          text:
            'You are Nova, a helpful, clear, and friendly AI assistant. Answer accurately and concisely. Use clean Markdown (headings, bullet points, bold text, and fenced code blocks with language tags) whenever it makes the response easier to read.'
        }
      ]
    },
    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 2048
    }
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);

  try {
    const geminiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    let data = null;
    try {
      data = await geminiResponse.json();
    } catch {
      data = null;
    }

    if (!geminiResponse.ok) {
      const status = geminiResponse.status;
      const upstreamMessage = data?.error?.message || '';
      console.error(`Gemini API error (${status}):`, upstreamMessage || data);

      let friendlyError = 'Unable to get a response from Google Gemini right now. Please try again.';
      if (status === 400) {
        friendlyError = upstreamMessage || 'The request sent to Gemini was invalid.';
      } else if (status === 401 || status === 403) {
        friendlyError =
          'Your Gemini API key was rejected or lacks permission. Please verify GEMINI_API_KEY in your environment variables.';
      } else if (status === 404) {
        friendlyError = `The configured Gemini model ("${model}") was not found. Check GEMINI_MODEL or update to a supported model.`;
      } else if (status === 429) {
        friendlyError =
          'Gemini API rate limit or quota reached. Please wait a few seconds and try again.';
      } else if (status >= 500) {
        friendlyError =
          'Google Gemini is temporarily unavailable or overloaded. Please try again shortly.';
      }

      return res.status(status >= 400 && status < 600 ? status : 502).json({
        error: friendlyError
      });
    }

    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts;
    const reply = Array.isArray(parts)
      ? parts
          .map(part => (typeof part?.text === 'string' ? part.text : ''))
          .join('')
          .trim()
      : '';

    if (!reply) {
      if (candidate?.finishReason === 'SAFETY' || data?.promptFeedback?.blockReason) {
        return res.status(400).json({
          error: 'This response was blocked by Gemini safety filters. Try rephrasing your question.'
        });
      }
      return res.status(502).json({
        error: 'Google Gemini returned an empty response. Please try asking again.'
      });
    }

    return res.status(200).json({
      reply,
      model
    });
  } catch (error) {
    console.error('Serverless /api/chat error:', error);

    if (error?.name === 'AbortError') {
      return res.status(504).json({
        error: 'The request to Google Gemini timed out. Please try again.'
      });
    }

    return res.status(500).json({
      error: 'An unexpected server error occurred while contacting Google Gemini.'
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
