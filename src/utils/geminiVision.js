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

// Identical to the server-side version, this function manages the local API call direct to Google.
// We use this branch primarily if developing locally where Vercel is mostly bypassed.
async function requestGeminiResponse({ action, mimeType, base64Data, signal, attempt = 1 }) {
  // Grab standard meta-injected local configuration rather than node envs.
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

// This function proxies the request to our secure Vercel Edge backend (api/gemini-vision.js).
// It acts as a safety bridge so we avoid exposing the GEMINI_API_KEY directly in the client bundle.
async function requestServerResponse({ action, imageDataUrl, signal }) {
  // Post against our own domain serverless endpoint.
  const response = await fetch("/api/gemini-vision", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    signal,
    body: JSON.stringify({
      actionId: action.id,
      imageDataUrl, // Propagating the heavy base64 to the edge worker.
    }),
  });

  // Attempt to decode the response which should match our `json(result)` structure from the API endpoint.
  const payload = await response.json().catch(() => ({}));

  // Edge and Cloudflare limits routinely throw 413 for enormous canvas uploads, intercept and explain nicely.
  if (response.status === 413) {
    return {
      status: "error",
      title: action.title,
      text: "This image is too large for the deployed AI route right now. Try a smaller image or crop it first.",
      provider: AI_ASSIST_PROVIDER,
      model: getGeminiModelForTier(action.modelTier),
    };
  }

  // Any other uncaught issue is generalized here as an error state for the GUI to render.
  if (!response.ok && !payload?.text) {
    return {
      status: "error",
      title: action.title,
      text: "The AI route could not process this image right now. Please try again.",
      provider: AI_ASSIST_PROVIDER,
      model: getGeminiModelForTier(action.modelTier),
    };
  }

  // Successful or structured error payload from our API, simply bubble it through.
  return payload;
}

// Primary frontend entrypoint when a user clicks any AI Action button.
// It decides whether to route the request through our secure /api backend (in production),
// or to hit Google APIs directly if running on a developer's localhost with injected Vite env vars.
export async function runGeminiVisionAction({ actionId, imageDataUrl, signal }) {
  const action = getAIAssistAction(actionId);

  // Validate that the ID refers to a supported feature.
  if (!action) {
    return {
      status: "error",
      title: "Unknown Action",
      text: "That AI assist action is not available right now.",
      provider: AI_ASSIST_PROVIDER,
      model: null,
    };
  }

  // Safe sniffer to check if we are developing locally.
  const isLocalHost =
    typeof window !== "undefined" &&
    ["localhost", "127.0.0.1"].includes(window.location.hostname);
    
  // On localhost, grab the dev API key from .env.local; otherwise force empty string to rely on server backend.
  const apiKey = isLocalHost ? import.meta.env.VITE_GEMINI_API_KEY?.trim() : "";

  // The standard Production Path (and also Localhost path if the user hasn't set VITE_GEMINI_API_KEY!).
  if (!apiKey) {
    return requestServerResponse({ action, imageDataUrl, signal });
  }

  // === LOCALHOST DIRECT REQUEST LOGIC === //
  // This executes *only* if the dev runs the app with VITE_GEMINI_API_KEY on localhost for testing.

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
