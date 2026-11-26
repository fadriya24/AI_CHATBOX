/**
 * Vercel Serverless Function: POST /api/chat
 * Securely communicates with the official Google Gemini REST API.
 * The GEMINI_API_KEY is read server-side from environment variables
 * and is never exposed to the client or browser.
 */

const GEMINI_MODEL = 'gemini-1.5-flash';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export default async function handler(req, res) {
  // Set CORS and response headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method Not Allowed. Only POST requests are supported.'
    });
  }

  // 1. Verify GEMINI_API_KEY exists in server environment
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'your_gemini_api_key_here') {
    return res.status(500).json({
      error: 'Gemini API key is not configured on the server. Please add GEMINI_API_KEY in your Vercel or .env settings.'
    });
  }

  try {
    // 2. Parse request body safely
    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (parseErr) {
        return res.status(400).json({ error: 'Invalid JSON payload received.' });
      }
    }

    const { message, history } = body || {};

    // 3. Validate user message
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        error: 'Message is required and must be a non-empty string.'
      });
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length > 2000) {
      return res.status(400).json({
        error: 'Message exceeds the maximum limit of 2,000 characters.'
      });
    }

    // 4. Format conversation history for Gemini API
    // Gemini expects: contents: [{ role: 'user' | 'model', parts: [{ text: '...' }] }]
    const contents = [];

    if (Array.isArray(history)) {
      // Keep only the last 10 messages for context efficiency
      const recentHistory = history.slice(-10);

      for (const item of recentHistory) {
        if (!item || typeof item.content !== 'string' || !item.content.trim()) {
          continue;
        }

        const geminiRole = item.role === 'assistant' || item.role === 'model' ? 'model' : 'user';
        const textContent = item.content.slice(0, 2000);

        // Ensure roles alternate appropriately as required by Gemini
        if (contents.length > 0 && contents[contents.length - 1].role === geminiRole) {
          // Merge consecutive messages with the same role
          contents[contents.length - 1].parts[0].text += '\n\n' + textContent;
        } else {
          contents.push({
            role: geminiRole,
            parts: [{ text: textContent }]
          });
        }
      }
    }

    // Append the new user message
    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += '\n\n' + trimmedMessage;
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: trimmedMessage }]
      });
    }

    // 5. Construct payload for Gemini REST API
    const geminiPayload = {
      contents: contents,
      systemInstruction: {
        parts: [
          {
            text: 'You are Nova, a friendly, modern, and highly capable AI assistant. Provide clear, accurate, and neatly structured responses. Use markdown for code blocks, bullet points, and headers when helpful.'
          }
        ]
      },
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
        topP: 0.95
      }
    };

    // 6. Call the official Gemini REST endpoint
    const endpointUrl = `${GEMINI_API_BASE}/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey.trim())}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout

    let geminiRes;
    try {
      geminiRes = await fetch(endpointUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(geminiPayload),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const data = await geminiRes.json();

    // 7. Handle non-200 responses from Google API
    if (!geminiRes.ok) {
      console.error('Gemini API Error Response:', data);

      const status = geminiRes.status;
      let friendlyError = 'An error occurred while contacting Google Gemini API.';

      if (status === 400) {
        friendlyError = data?.error?.message || 'Invalid request format sent to Gemini API.';
      } else if (status === 401 || status === 403) {
        friendlyError = 'Invalid or unauthorized Gemini API key. Please verify your GEMINI_API_KEY in environment variables.';
      } else if (status === 429) {
        friendlyError = 'Gemini API rate limit reached. Please wait a moment before sending another message.';
      } else if (status === 503 || status === 500) {
        friendlyError = 'Google Gemini service is temporarily overloaded. Please try again shortly.';
      }

      return res.status(status >= 400 && status < 600 ? status : 500).json({
        error: friendlyError
      });
    }

    // 8. Extract the text reply safely
    const candidate = data?.candidates?.[0];
    const textReply = candidate?.content?.parts?.[0]?.text;

    if (!textReply || typeof textReply !== 'string') {
      // Check if blocked by safety ratings
      if (candidate?.finishReason === 'SAFETY') {
        return res.status(400).json({
          error: 'The response was blocked by Google safety guidelines.'
        });
      }
      return res.status(502).json({
        error: 'Received an empty response from Gemini model.'
      });
    }

    // 9. Return the clean AI response
    return res.status(200).json({
      reply: textReply.trim()
    });

  } catch (error) {
    console.error('Serverless Chat Handler Error:', error);

    if (error.name === 'AbortError') {
      return res.status(504).json({
        error: 'Request timed out waiting for Gemini response. Please try again.'
      });
    }

    return res.status(500).json({
      error: 'An internal server error occurred. Please try again later.'
    });
  }
}
