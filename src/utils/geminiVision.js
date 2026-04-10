import {
  AI_ASSIST_PROVIDER,
  getAIAssistAction,
  getGeminiModelForTier,
} from "./aiAssistConfig";
import {
  GEMINI_ENDPOINT,
  buildPrompt,
  extractResponseText,
  getGeminiRequestSettings,
  isResponseTooShort,
  parseImageDataUrl,
  sanitizeResponseText,
  shortenResponseText,
} from "./geminiVisionShared.js";

async function requestGeminiResponse({ action, mimeType, base64Data, signal, attempt = 1 }) {
  const model = getGeminiModelForTier(action.modelTier);
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim();
  const { maxOutputTokens, thinkingLevel } = getGeminiRequestSettings(action);

  const response = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey,
    },
    signal,
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: buildPrompt(action, attempt) },
            {
              inlineData: {
                mimeType,
                data: base64Data,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: action.modelTier === "deep" ? 0.35 : 0.5,
        maxOutputTokens,
        thinkingConfig: {
          thinkingLevel,
        },
      },
    }),
  });

  const payload = await response.json().catch(() => ({}));

  return { model, response, payload };
}

async function requestServerResponse({ action, imageDataUrl, signal }) {
  const response = await fetch("/api/gemini-vision", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      actionId: action.id,
      imageDataUrl,
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (response.status === 413) {
    return {
      status: "error",
      title: action.title,
      text: "This image is too large for the deployed AI route right now. Try a smaller image or crop it first.",
      provider: AI_ASSIST_PROVIDER,
      model: getGeminiModelForTier(action.modelTier),
    };
  }

  if (!response.ok && !payload?.text) {
    return {
      status: "error",
      title: action.title,
      text: "The AI route could not process this image right now. Please try again.",
      provider: AI_ASSIST_PROVIDER,
      model: getGeminiModelForTier(action.modelTier),
    };
  }

  return payload;
}

export async function runGeminiVisionAction({ actionId, imageDataUrl, signal }) {
  const action = getAIAssistAction(actionId);

  if (!action) {
    return {
      status: "error",
      title: "Unknown Action",
      text: "That AI assist action is not available right now.",
      provider: AI_ASSIST_PROVIDER,
      model: null,
    };
  }

  const isLocalHost =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);
  const apiKey = isLocalHost ? import.meta.env.VITE_GEMINI_API_KEY?.trim() : "";

  if (!apiKey) {
    return requestServerResponse({ action, imageDataUrl, signal });
  }

  const { mimeType, base64Data } = parseImageDataUrl(imageDataUrl);

  let { model, response, payload } = await requestGeminiResponse({
    action,
    mimeType,
    base64Data,
    signal,
    attempt: 1,
  });

  if (!response.ok) {
    return {
      status: "error",
      title: action.title,
      text: payload?.error?.message || "Gemini could not process this image right now. Please try again.",
      provider: AI_ASSIST_PROVIDER,
      model,
    };
  }

  let text = shortenResponseText(action, sanitizeResponseText(extractResponseText(payload)));

  if (text && isResponseTooShort(action, text)) {
    const retryResult = await requestGeminiResponse({
      action,
      mimeType,
      base64Data,
      signal,
      attempt: 2,
    });

    model = retryResult.model;

    if (retryResult.response.ok) {
      const retryText = shortenResponseText(
        action,
        sanitizeResponseText(extractResponseText(retryResult.payload))
      );

      if (retryText) {
        text = retryText;
      }
    }
  }

  if (!text) {
    return {
      status: "error",
      title: action.title,
      text: "Gemini returned an empty response. Please try the action again.",
      provider: AI_ASSIST_PROVIDER,
      model,
    };
  }

  return {
    status: "success",
    title: action.title,
    text,
    provider: AI_ASSIST_PROVIDER,
    model,
  };
}
