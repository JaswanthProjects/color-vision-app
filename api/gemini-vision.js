import {
  AI_ASSIST_PROVIDER,
  getAIAssistAction,
} from "../src/utils/aiAssistConfig.js";

// Standardized JSON response helper for standard node/Vercel environments.
function json(data, init = {}) {
  return Response.json(data, init);
}

function getMissingKeyResult(action) {
  return {
    status: "missing-key",
    title: action.title,
    text: "AI assist is disabled right now.",
    provider: AI_ASSIST_PROVIDER,
    model: null,
  };
}

// Standard POST handler for intercepting the Vercel serverless route.
// Validates incoming HTTP calls from the React application and returns the disabled AI state.
export async function POST(request) {
  try {
    const payload = await request.json().catch(() => null);
    const actionId = payload?.actionId;
    const imageDataUrl = payload?.imageDataUrl;

    if (!actionId || !imageDataUrl) {
      return json(
        {
          status: "error",
          title: "Invalid Request",
          text: "Missing action or image data.",
          provider: AI_ASSIST_PROVIDER,
          model: null,
        },
        { status: 400 }
      );
    }

    const action = getAIAssistAction(actionId);

    if (!action) {
      return json({
        status: "error",
        title: "Unknown Action",
        text: "That AI assist action is not available right now.",
        provider: AI_ASSIST_PROVIDER,
        model: null,
      });
    }

    return json(getMissingKeyResult(action));
  } catch (error) {
    return json(
      {
        status: "error",
        title: "AI Assist Error",
        text:
          error instanceof Error
            ? error.message
            : "Something went wrong while checking AI assist configuration.",
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

