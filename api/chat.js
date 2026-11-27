
/**
 * Nova AI - Gemini API
 * Vercel Serverless Function: POST /api/chat
 */

const DEFAULT_MODEL = "gemini-2.5-flash";

const GEMINI_API_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_ITEMS = 16;
const REQUEST_TIMEOUT = 50000;
const MAX_RETRIES = 2;

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

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed."
    });
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    return res.status(500).json({
      error: "Gemini API key is not configured on Vercel."
    });
  }

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

  const model = (
    process.env.GEMINI_MODEL || DEFAULT_MODEL
  ).trim();

  const endpoint =
    `${GEMINI_API_BASE}/${encodeURIComponent(model)}:generateContent`;

  const payload = {
    contents,

    systemInstruction: {
      parts: [{
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
      }]
    },

    generationConfig: {
      temperature: 0.7,
      topP: 0.95,
      maxOutputTokens: 1024
    }
  };

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();

    const timeoutId = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT
    );

    try {
      console.log("Nova AI: Sending request.");
      console.log("Gemini model:", model);
      console.log("Attempt:", attempt + 1);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      const responseText = await response.text();

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        return res.status(502).json({
          error: "Gemini returned an invalid response."
        });
      }

      if (!response.ok) {
        const status = response.status;
        const googleError = data?.error?.message || "";

        console.error("Gemini API status:", status);
        console.error("Gemini API error:", googleError);

        if (
          (status === 429 || status === 500 ||
            status === 502 || status === 503 ||
            status === 504) &&
          attempt < MAX_RETRIES
        ) {
          await wait(1000 * (attempt + 1));
          continue;
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
            error: "Gemini is temporarily unavailable. Please try again later."
          });
        }

        return res.status(400).json({
          error: googleError || "Gemini request failed."
        });
      }

      const candidate = data?.candidates?.[0];

      const reply = (candidate?.content?.parts || [])
        .map(part =>
          typeof part.text === "string" ? part.text : ""
        )
        .join("")
        .trim();

      if (!reply) {
        return res.status(502).json({
          error: "Gemini returned an empty response."
        });
      }

      console.log("Nova AI: Response received.");

      return res.status(200).json({
        success: true,
        reply,
        model
      });

    } catch (error) {
      console.error("Nova AI request failed:", error?.name);

      if (attempt < MAX_RETRIES) {
        await wait(1000 * (attempt + 1));
        continue;
      }

      return res.status(502).json({
        error: "Unable to connect to Gemini. Please try again."
      });

    } finally {
      clearTimeout(timeoutId);
    }
  }

  return res.status(502).json({
    error: "Gemini is temporarily unavailable."
  });
}
