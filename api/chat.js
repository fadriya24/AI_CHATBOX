
/**
 * Nova AI - Gemini API
 * Vercel Serverless Function: POST /api/chat
 */

const DEFAULT_MODEL = "gemini-flash-latest";

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_ITEMS = 16;
const REQUEST_TIMEOUT = 50000;

function normalizeHistory(history) {
  if (!Array.isArray(history)) return [];

  const contents = [];

  for (const item of history.slice(-MAX_HISTORY_ITEMS)) {
    if (!item || typeof item.content !== "string") continue;

    const text = item.content.trim().slice(0, MAX_MESSAGE_LENGTH);

    if (!text) continue;

    const role =
      item.role === "assistant" || item.role === "model"
        ? "model"
        : "user";

    if (contents.length === 0 && role === "model") continue;

    const previous = contents[contents.length - 1];

    if (previous && previous.role === role) {
      previous.parts[0].text += "\n\n" + text;
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
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "POST, OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type"
    );

    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  // 1. Check API key
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.error("GEMINI_API_KEY is missing.");

    return res.status(500).json({
      error: "Gemini API key is not configured on Vercel."
    });
  }

  // 2. Read request body
  let body = req.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({
        error: "Invalid JSON request."
      });
    }
  }

  if (!body || typeof body !== "object") {
    return res.status(400).json({
      error: "Invalid request body."
    });
  }

  const { message, history } = body;

  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({
      error: "Please enter a message."
    });
  }

  const userMessage = message.trim();

  if (userMessage.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({
      error: "Message exceeds the 4000 character limit."
    });
  }

  // 3. Prepare conversation
  const contents = normalizeHistory(history);

  const lastTurn = contents[contents.length - 1];

  if (lastTurn && lastTurn.role === "user") {
    lastTurn.parts[0].text += "\n\n" + userMessage;
  } else {
    contents.push({
      role: "user",
      parts: [{ text: userMessage }]
    });
  }

  // 4. Select Gemini model
  const model = (
    process.env.GEMINI_MODEL || DEFAULT_MODEL
  ).trim();

  const endpoint =
    `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`;

  // 5. Gemini request payload
  const payload = {
    contents,

    systemInstruction: {
      parts: [
        {
          text: `
You are Nova, a helpful AI assistant.

Your responsibilities:
- Give accurate and useful answers.
- Explain difficult topics in simple English.
- Be friendly and professional.
- Use headings and bullet points when useful.
- Write clean Markdown.
- If you are unsure, say so honestly.
          `.trim()
        }
      ]
    },

    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 1024
    }
  };

  // 6. Set request timeout
  const controller = new AbortController();

  let timedOut = false;

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT);

  try {
    console.log("Nova AI: Sending request to Gemini.");
    console.log("Gemini model:", model);

    // 7. Call Gemini API
    const geminiResponse = await fetch(endpoint, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey
      },

      body: JSON.stringify(payload),
      signal: controller.signal
    });

    const responseText = await geminiResponse.text();

    let data;

    try {
      data = JSON.parse(responseText);
    } catch {
      console.error("Gemini returned an invalid response.");

      return res.status(502).json({
        error: "Gemini returned an invalid response. Please try again."
      });
    }

    // 8. Handle Gemini API errors
    if (!geminiResponse.ok) {
      const status = geminiResponse.status;

      const googleError =
        data?.error?.message || "";

      console.error("Gemini API status:", status);
      console.error("Gemini API error:", googleError);

      if (status === 400) {
        return res.status(400).json({
          error: googleError || "Invalid Gemini request."
        });
      }

      if (status === 401 || status === 403) {
        return res.status(status).json({
          error: "Gemini API key is invalid or does not have permission."
        });
      }

      if (status === 404) {
        return res.status(404).json({
          error: `Gemini model "${model}" was not found.`
        });
      }

      if (status === 429) {
        return res.status(429).json({
          error: "Gemini API quota or rate limit reached. Try again later."
        });
      }

      if (status >= 500) {
        return res.status(502).json({
          error: "Google Gemini is temporarily unavailable."
        });
      }

      return res.status(502).json({
        error: googleError || "Gemini request failed."
      });
    }

    // 9. Extract AI response
    const candidate = data?.candidates?.[0];

    const parts = candidate?.content?.parts || [];

    const reply = parts
      .map(part =>
        typeof part.text === "string" ? part.text : ""
      )
      .join("")
      .trim();

    if (!reply) {
      console.error(
        "Gemini returned no text. Finish reason:",
        candidate?.finishReason
      );

      if (
        candidate?.finishReason === "SAFETY" ||
        data?.promptFeedback?.blockReason
      ) {
        return res.status(400).json({
          error: "Gemini could not answer this request. Please rephrase it."
        });
      }

      return res.status(502).json({
        error: "Gemini returned an empty response."
      });
    }

    // 10. Successful response
    console.log("Nova AI: Gemini response received.");

    return res.status(200).json({
      success: true,
      reply,
      model
    });

  } catch (error) {
    console.error("Nova AI request failed:", error?.name || "UnknownError");

    if (timedOut || error?.name === "AbortError") {
      return res.status(504).json({
        error: timedOut
          ? "Gemini request exceeded 50 seconds. Please try again."
          : "The connection to Gemini was interrupted. Please try again."
      });
    }

    return res.status(502).json({
      error: "Unable to connect to Google Gemini. Check your connection and try again."
    });

  } finally {
    clearTimeout(timeoutId);
  }
}
