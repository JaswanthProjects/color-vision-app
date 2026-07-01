import {
  AI_ASSIST_PROVIDER,
  getAIAssistAction,
  getGeminiModelForTier,
} from "./aiAssistConfig";

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
// It routes requests through our secure /api backend so API keys never enter the client bundle.
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

  return requestServerResponse({ action, imageDataUrl, signal });
}
