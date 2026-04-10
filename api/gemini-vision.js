import {
  AI_ASSIST_PROVIDER,
  getAIAssistAction,
  resolveGeminiModelForTier,
} from "../src/utils/aiAssistConfig.js";
import {
  GEMINI_ENDPOINT,
  buildPrompt,
  extractResponseText,
  getGeminiRequestSettings,
  isResponseTooShort,
  parseImageDataUrl,
  sanitizeResponseText,
  shortenResponseText,
} from "../src/utils/geminiVisionShared.js";

// Standardized JSON response helper for standard node/Vercel standard environments.
// We use this to quickly return a valid JSON Response object with the proper headers.
function json(data, init = {}) {
  return Response.json(data, init);
}

// Helper function designed purely to do the heavy lifting of communicating with the Google Gemini API.
// It determines the right model, gathers configuration, constructs the payload, and sends the request.
// 'attempt' keeps track of potential retries.
async function requestGeminiResponse({ action, mimeType, base64Data, signal, attempt = 1 }) {
  // Resolve the proper Gemini model based on if the 'action.modelTier' requires deep thinking or is fast.
  const model = resolveGeminiModelForTier(process.env, action.modelTier);
  
  // Securely retrieve the API key from environment variables avoiding hardcoding strings.
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  
  // Retrieve settings based on the action, such as token limits and thinking intensity.
  const { maxOutputTokens, thinkingLevel } = getGeminiRequestSettings(action);

  // Excecute the fetch call directly against Google's Gemini public endpoint.
  // Utilizing the 'signal' passed down ensures we can abort the request if the client disconnects or times out.
  const response = await fetch(`${GEMINI_ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": apiKey, // Use header-based auth instead of URL query parameters for enhanced security.
    },
    signal,
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: buildPrompt(action, attempt) }, // Provide the dynamically built text prompt.
            {
              inlineData: {
                mimeType,  // Pass along the mime type derived from the base64 data.
                data: base64Data, // Include the image base64 directly for analysis.
              },
            },
          ],
        },
      ],
      generationConfig: {
        // Drop the temperature for 'deep' reasoning actions to reduce hallucinations and get more predictable results.
        temperature: action.modelTier === "deep" ? 0.35 : 0.5,
        maxOutputTokens, // Limit verbosity where required by the helper rules.
        thinkingConfig: {
          thinkingLevel, // Used when deep thinking actions utilize Gemini thinking features.
        },
      },
    }),
  });

  // Try parsing the json output. Standard safeguard: if it fails, provide an empty object gracefully.
  const payload = await response.json().catch(() => ({}));

  // Return the model utilized, the raw fetch Response, and the parsed payload text.
  return { model, response, payload };
}

// Primary coordinator that manages the lifecycle of the AI Vision process.
// It verifies validity, prepares data, formats the response, and manages auto-retries when the AI falls short.
async function runGeminiVisionAction({ actionId, imageDataUrl, signal }) {
  // Translate string ID to a full action configuration item.
  const action = getAIAssistAction(actionId);

  // If the frontend requests a feature that we do not know about, fail early and inform the user.
  if (!action) {
    return {
      status: "error",
      title: "Unknown Action",
      text: "That AI assist action is not available right now.",
      provider: AI_ASSIST_PROVIDER,
      model: null,
    };
  }

  // Double check our keys before we jump into decoding and sending payload to save time.
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  // Without an API key, we have no path forward. Prompt the user contextually to add the key via Vercel config.
  if (!apiKey) {
    return {
      status: "missing-key",
      title: action.title,
      text: "Gemini API key not configured on the server yet. Add GEMINI_API_KEY in Vercel before using live AI responses.",
      provider: AI_ASSIST_PROVIDER,
      model: resolveGeminiModelForTier(process.env, action.modelTier),
    };
  }

  // Parse out the format so Gemini can accept the raw base64 buffer and understand the mimeType associated.
  const { mimeType, base64Data } = parseImageDataUrl(imageDataUrl);

  // Send our first attempt payload out.
  let { model, response, payload } = await requestGeminiResponse({
    action,
    mimeType,
    base64Data,
    signal,
    attempt: 1, // Let prompt builder know this is the first shot.
  });

  // Catch network or Google API side HTTP errors immediately to provide a robust UX showing an error popup.
  if (!response.ok) {
    return {
      status: "error",
      title: action.title,
      text: payload?.error?.message || "Gemini could not process this image right now. Please try again.",
      provider: AI_ASSIST_PROVIDER,
      model,
    };
  }

  // Extract raw text from the payload JSON trees and sanitize it of markdown block structures.
  let text = shortenResponseText(action, sanitizeResponseText(extractResponseText(payload)));

  // **Retry Logic:** Sometimes the AI might reply with a very short ambiguous message (e.g., "I don't know").
  // Since we require descriptive actions, we detect shorter-than-expected constraints and optionally trigger a retry attempt.
  if (text && isResponseTooShort(action, text)) {
    // Re-call the helper function, denoting it is attempt #2, which could change the hidden prompt modifier slightly.
    const retryResult = await requestGeminiResponse({
      action,
      mimeType,
      base64Data,
      signal,
      attempt: 2,
    });

    model = retryResult.model;

    // Evaluate retry logic - if successful, apply sanitization overrides over the prior variables.
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

  // Final catch-all if even the retry failed or we simply got absolute empty back.
  if (!text) {
    return {
      status: "error",
      title: action.title,
      text: "Gemini returned an empty response. Please try the action again.",
      provider: AI_ASSIST_PROVIDER,
      model,
    };
  }

  // Success path! Funnel data down to the app.
  return {
    status: "success",
    title: action.title,
    text,
    provider: AI_ASSIST_PROVIDER,
    model,
  };
}

// Standard POST handler for intercepting the Vercel edge/serverless route.
// Validates incoming HTTP calls from the react application and proxies down to logic.
export async function POST(request) {
  try {
    // Try to safely parse the JSON blob coming from the client payload.
    const payload = await request.json().catch(() => null);
    const actionId = payload?.actionId;
    const imageDataUrl = payload?.imageDataUrl;

    // Ensure we actually have the required properties set prior to acting.
    if (!actionId || !imageDataUrl) {
      return json(
        {
          status: "error",
          title: "Invalid Request",
          text: "Missing action or image data.",
          provider: AI_ASSIST_PROVIDER,
          model: null,
        },
        { status: 400 } // Send a 400 Bad Request indicating the user input was to blame.
      );
    }

    // Await the heavy logic implementation handler.
    const result = await runGeminiVisionAction({
      actionId,
      imageDataUrl,
      // The `request.signal` keeps track of HTTP connection state and will cancel if client terminates early.
      signal: request.signal, 
    });

    // Provide the successful result.
    return json(result);
  } catch (error) {
    // If the error was purposefully triggered because `request.signal` aborted the fetch.
    if (error instanceof Error && error.name === "AbortError") {
      return json(
        {
          status: "error",
          title: "Request Canceled",
          text: "The AI request was canceled before it finished.",
          provider: AI_ASSIST_PROVIDER,
          model: null,
        },
        { status: 499 } // 499 Custom constant frequently used in NGINX indicating Client Closed Request.
      );
    }

    // Default 500 error bucket for any other exceptions related to payload processing or unexpected crashes.
    return json(
      {
        status: "error",
        title: "AI Assist Error",
        text:
          error instanceof Error
            ? error.message
            : "Something went wrong while analyzing this image.",
        provider: AI_ASSIST_PROVIDER,
        model: null,
      },
      { status: 500 }
    );
  }
}

// Handle GET requests to deter unintended usages or basic pings.
export async function GET() {
  return json({ message: "Method not allowed." }, { status: 405 });
}
