# AI Assist Screen Design

Date: 2026-04-09
Project: ColorVision
Status: Approved for spec review

## Goal

Add a dedicated AI Assist experience for uploaded or camera-captured images. The user should be able to open a new screen from the image preview, run one of several AI-powered image understanding actions, read the response as text, and optionally play that response aloud with browser speech synthesis.

This first version should:

- keep the current capture and upload flow intact
- avoid pushing changes to GitHub during implementation
- work locally without crashing before a Gemini API key is configured
- use Gemini as the first provider once `VITE_GEMINI_API_KEY` is available
- return text for every action in v1, even for visually named actions

## Scope

### In Scope

- Add a new `AI Assist` entry point from the image preview screen
- Add a new app mode and screen for AI image assistance
- Display the selected image and a side panel of AI actions
- Support these six actions:
  - Describe This Image
  - Check Accessibility
  - Read Dominant Colors
  - Show Repaired Version
  - Switch to Low Vision Mode
  - Highlight Danger Zones
- Show AI results as text in a results panel
- Add a `Play Voice` control that reads the result aloud using browser speech synthesis
- Add loading, success, missing-key, and error states
- Wire the UI to Gemini through a single helper module
- Verify the flow locally

### Out of Scope

- Real image editing or overlay rendering for repaired, low-vision, or danger-zone views
- Backend proxying or secure server-side key handling
- Multi-action queueing or parallel requests
- GitHub push or Vercel deployment changes
- Long-term provider abstraction beyond a clean Gemini-first helper boundary

## User Flow

1. The user uploads an image or captures one with the camera.
2. The app routes to the existing preview screen.
3. The preview screen includes a new `AI Assist` button.
4. The user opens the new AI Assist screen.
5. The AI Assist screen shows:
   - the image preview
   - a vertical action panel
   - a result panel
6. When the user clicks an action:
   - the action enters a loading state
   - the app sends the image plus an action-specific prompt to Gemini
   - the result panel displays the returned text
7. After text is shown, the user can press `Play Voice` to hear it spoken aloud.
8. If the key is missing or the request fails, the result panel shows a friendly status message and allows retrying the action.

## Screen Design

## Preview Screen

- Keep the current image preview layout and existing actions
- Add a new `AI Assist` button alongside the other next-step actions
- The button routes to a new dedicated screen instead of crowding the preview layout

## AI Assist Screen

### Desktop Layout

- Left column: large image preview
- Right column: stacked AI action buttons
- Beneath or within the right column: result panel for text output, status, and voice controls

### Mobile Layout

- Image first
- AI action buttons second
- Result panel last

### Visual Behavior

- Reuse the app's existing glassmorphism styling and dark theme language
- Highlight the selected action while it is active or after it completes
- Keep the layout readable and uncluttered, with the image remaining visually primary

## Actions And Prompt Intent

The screen will be driven by a shared action configuration array. Each action maps to an id, label, help text, and prompt template.

### Action Set

- `describe-image`
  - Return a plain-language description of the scene, objects, layout, and notable details.
- `check-accessibility`
  - Return accessibility observations, likely readability issues, contrast concerns, and potential user-impact notes.
- `read-dominant-colors`
  - Return a user-friendly summary of the main visible colors and how they appear in the image.
- `show-repaired-version`
  - Return a text explanation of how the image could be adjusted for clarity or accessibility.
- `switch-low-vision-mode`
  - Return a text explanation of what low-vision-friendly adjustments would help and why.
- `highlight-danger-zones`
  - Return a text summary of visually risky areas such as low-contrast regions, dense detail, glare, or confusing color groupings.

The last three actions are intentionally text-only in v1 even though their names imply visual changes.

## Technical Design

## App Routing

- Extend app state in `src/App.jsx` with a new mode such as `aiAssist`
- Pass the current captured image into the new screen
- Return to the preview screen via an existing-style back interaction

## Components

### `src/components/ImagePreview.jsx`

- Add a new `AI Assist` action button
- Keep current actions intact

### `src/components/AIAssistMode.jsx`

- New screen component responsible for:
  - image presentation
  - AI action list
  - status management
  - result rendering
  - voice playback controls

### Optional small helper components

Only extract focused subcomponents if `AIAssistMode.jsx` becomes hard to follow during implementation. Examples:

- `AIAssistActionList`
- `AIAssistResultPanel`

This should be done only if it improves clarity without adding unnecessary indirection.

## Gemini Integration

### Module

Create a helper such as `src/utils/geminiVision.js` that exposes one main function. Example responsibility:

- accept the image data URL
- accept the action id
- read `import.meta.env.VITE_GEMINI_API_KEY`
- build the request payload and action-specific prompt
- call Gemini
- normalize the returned text for the UI

### Provider Behavior

- Gemini is the first provider
- The UI should not assume multi-provider switching yet
- The helper should still be isolated enough that provider logic is not embedded directly in the screen component

### Key Handling

- Use `VITE_GEMINI_API_KEY` for local development readiness
- If the key is missing, return a friendly message rather than throwing uncaught errors
- Note: this is acceptable for local development, but production deployment should eventually move API access behind a server-side route so the key is not exposed in a client bundle

## State Model

The AI Assist screen should manage focused local state, including:

- `activeActionId`
- `resultTitle`
- `resultText`
- `status` such as `idle`, `loading`, `success`, `error`, `missing-key`
- `errorMessage`
- `isSpeaking`

Only one action runs at a time in v1. Starting a new action replaces the previous result.

## Voice Playback

- Use `window.speechSynthesis`
- Show `Play Voice` when text is available
- While speaking, the control may switch to `Stop Voice`
- Cancel any active utterance when:
  - the user starts another action
  - the user leaves the AI Assist screen
  - the user manually stops playback

## Error Handling

### Missing API Key

- Buttons remain visible and usable
- Clicking an action shows a result-panel message indicating that the Gemini API key is not configured yet

### API Failure

- Show a readable error message in the result panel
- Keep the screen interactive
- Offer a retry path by allowing the same action to be clicked again

### Invalid Or Unsupported Image Issues

- Show a user-readable failure state if the image cannot be processed
- Avoid blank panels or silent failure

## Testing Plan

Local verification should cover:

- upload flow to preview screen
- camera flow to preview screen if practical in local testing
- navigation from preview to AI Assist
- rendering of all six action buttons
- loading state when an action begins
- missing-key fallback if `VITE_GEMINI_API_KEY` is absent
- successful text rendering when a response is available
- `Play Voice` behavior using browser speech synthesis
- responsive behavior on smaller screen widths

## Risks And Constraints

- Frontend API-key usage is not appropriate for a long-term production deployment
- Gemini response formatting may vary, so the helper should normalize text defensively
- Browser speech synthesis availability and voice quality can differ by browser and OS
- Existing repo lint issues outside this feature area should not be mixed into this work unless they block implementation

## Recommended Implementation Order

1. Add new app mode and preview-screen entry button
2. Build the AI Assist screen layout with static action config
3. Add result panel and status handling
4. Add Gemini helper with missing-key fallback
5. Connect actions to prompts and result rendering
6. Add speech synthesis controls
7. Run local verification and refine UX
