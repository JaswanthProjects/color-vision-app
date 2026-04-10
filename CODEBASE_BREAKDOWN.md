# ColorVision — Complete Codebase Breakdown

A full explanation of every file, feature, and how they connect. Use this to understand and explain the entire app.

---

## Table of Contents

1. [App Overview](#1-app-overview)
2. [File Map](#2-file-map)
3. [Feature 1: Color Analysis (Pixel Picker + Palette)](#3-feature-1-color-analysis)
4. [Feature 2: Colorblind Assist (Filters)](#4-feature-2-colorblind-assist)
5. [Feature 3: AI Assist (Gemini Vision)](#5-feature-3-ai-assist-gemini-vision)
6. [How the AI Backend Works](#6-how-the-ai-backend-works)
7. [Key Algorithms](#7-key-algorithms)
8. [Environment Variables](#8-environment-variables)
9. [Tech Stack](#9-tech-stack)

---

## 1. App Overview

**ColorVision** is a web app that helps people understand and work with colors in images — especially people who are colorblind or have low vision.

**Three main features:**

| Feature | What it does | How it works |
|---------|-------------|--------------|
| **Analyze Colors** | Pick any pixel, see its exact color name, hex code, RGB, HSL. Also shows the 5 most dominant colors (palette). | Runs entirely in the browser using canvas pixel reading + K-Means clustering algorithm |
| **Colorblind Assist** | Apply color correction filters so colorblind users can distinguish colors they normally can't tell apart. Also simulate what colorblind people see. | Runs entirely in the browser using matrix math on every pixel (daltonization) |
| **AI Assist** | Send the image to Google's Gemini AI and get back text analysis — descriptions, accessibility reviews, danger zone identification, and more. Results can be read aloud. | Sends image to a server-side API route which forwards it to Google Gemini. Results come back as plain text. |

---

## 2. File Map

```
color-app/
├── api/
│   └── gemini-vision.js          ← Serverless backend (Vercel Edge Function)
│                                    Proxies requests to Google Gemini API securely
│
├── src/
│   ├── App.jsx                   ← ROOT COMPONENT — the central state machine
│   │                               Controls which screen is shown (home → camera → preview → ...)
│   │
│   ├── components/
│   │   ├── CameraView.jsx        ← Live camera access + photo capture
│   │   ├── ImagePreview.jsx      ← Shows captured photo + 3 action buttons
│   │   ├── AnalysisMode.jsx      ← Wrapper for the color analysis tool
│   │   ├── AdvancedAnalysis.jsx  ← The actual color picker, magnifier, palette
│   │   ├── ColorblindAssist.jsx  ← Colorblind filter UI (daltonize/enhance/simulate)
│   │   └── AIAssistMode.jsx      ← AI analysis UI with text-to-speech
│   │
│   ├── utils/
│   │   ├── colorUtils.js         ← Color math: RGB↔HSL↔LAB conversions, Delta-E,
│   │   │                           color naming, 700+ named color database
│   │   ├── colorblindFilters.js  ← Daltonization matrices, enhancement, simulation,
│   │   │                           high contrast — all the pixel-level filter math
│   │   ├── aiAssistConfig.js     ← AI action definitions: prompts, model tiers, tones
│   │   ├── geminiVision.js       ← Frontend AI request handler (decides local vs server)
│   │   └── geminiVisionShared.js ← Shared helpers: prompt builder, text sanitizer,
│   │                               response validator, request settings
│   │
│   ├── index.css                 ← Global styles (glassmorphism design system)
│   └── main.jsx                  ← React entry point
│
├── index.html                    ← The single HTML page
├── vite.config.js                ← Vite bundler configuration
├── tailwind.config.js            ← Tailwind CSS configuration
└── package.json                  ← Dependencies and scripts
```

---

## 3. Feature 1: Color Analysis

### How it works (step by step)

1. **Image loads** → drawn onto an HTML `<canvas>` at full resolution
2. **Offscreen canvas** → a hidden copy is kept at original resolution for accurate pixel sampling
3. **Mouse hover** → reads the exact pixel under the cursor using `getImageData(x, y, 1, 1)`
4. **Color ID** → the RGB value goes through `analyzeColor()` which returns:
   - **Hex code** (e.g., `#4A90D9`)
   - **HSL values** (Hue, Saturation, Lightness)
   - **Descriptive name** (e.g., "Moderate Sky Blue") using hue ranges
   - **Closest named color** (e.g., "Cornflower Blue") using Delta-E 2000 matching against 700+ colors
   - **Basic color** (e.g., "Blue" with 🔵 emoji) — simplified for colorblind users
5. **Palette extraction** → K-Means clustering samples ~2000 pixels and groups them into the 5 most dominant colors
6. **Magnifier** → a floating loupe shows an 11×11 pixel area zoomed up to 55×55px with a crosshair

### Key files

| File | What it does |
|------|-------------|
| `AdvancedAnalysis.jsx` | The main UI — canvas, magnifier, zoom controls, color info cards, palette display |
| `colorUtils.js` | All the math — RGB↔HSL↔LAB conversions, Delta-E 2000, hue naming, 700+ named colors |
| `AnalysisMode.jsx` | Thin wrapper that adds a title bar and back button |

### Key algorithm: Delta-E 2000

This is a scientifically-derived formula that measures how different two colors look **to the human eye**. We use it to find the closest matching color name from our 700+ color database. It's more accurate than simple RGB distance because it accounts for how human vision perceives color differences.

### Key algorithm: K-Means Clustering

Groups similar pixels into clusters to find the dominant colors. Steps:
1. Sample ~2000 pixels from the image (skipping every Nth pixel for speed)
2. Randomly pick 5 starting "center" colors
3. Assign each sampled pixel to its nearest center
4. Recalculate centers as the average of their assigned pixels
5. Repeat steps 3-4 five times
6. The final 5 centers ARE the dominant colors (palette)

---

## 4. Feature 2: Colorblind Assist

### How it works

The image is drawn onto a `<canvas>`. When a filter is selected, we loop through **every single pixel** (all R, G, B values) and apply a mathematical transformation.

### Three categories of filters

#### Assist (Daltonization) — "Make invisible colors visible"
The core algorithm:
1. **Simulate** what a colorblind person sees (using a 3×3 color matrix)
2. **Calculate the error** — the difference between the original and simulated colors
3. **Shift the error** into channels the person CAN see (e.g., shift lost red info into blue)
4. **Add the shifted error** back to the original color

This means colors that would normally look identical to a colorblind person now look different!

#### Enhance — "Boost problem colors"
Converts to HSL, then:
- Shifts hue ranges that are problematic (e.g., moves greens toward cyan/blue)
- Boosts saturation for problem color ranges
- High Contrast mode: maximizes saturation and pushes lightness to extremes

#### Simulate — "See through colorblind eyes"
Applies the simulation matrix WITHOUT the correction step. Shows what the image looks like to someone with that type of colorblindness. Useful for designers checking accessibility.

### Key files

| File | What it does |
|------|-------------|
| `ColorblindAssist.jsx` | The filter UI — canvas, filter buttons in 3 categories, toggle on/off, reset |
| `colorblindFilters.js` | All the pixel math — daltonization, enhancement, simulation, HSL conversion |

### The three types of colorblindness handled

| Type | Affects | Prevalence |
|------|---------|------------|
| **Protanopia** | Red-blind | ~1% of males |
| **Deuteranopia** | Green-blind | ~1% of males (most common) |
| **Tritanopia** | Blue-blind | Rare (~0.01%) |

---

## 5. Feature 3: AI Assist (Gemini Vision)

### How it works (step by step)

1. User clicks one of 5 AI action buttons
2. The app takes the image (base64 string) + the action's prompt
3. Sends it to Google Gemini's vision model
4. Gemini analyzes the image and returns plain text
5. The text is displayed in a result panel
6. User can click "Play Voice" to hear the text read aloud (Web Speech API)

### The 5 AI Actions

| Action | What it asks Gemini | Model Tier | Purpose |
|--------|-------------------|-----------|---------|
| **Describe This Image** | Describe the scene in plain English | Fast | Quick orientation for someone who can't see well |
| **Check Accessibility** | Review for contrast issues, readability problems | Deep | Find usability concerns for low-vision/colorblind users |
| **Read Dominant Colors** | Identify and locate the main colors | Fast | Quick color identification |
| **Repair & Adapt** | Suggest image repairs AND low-vision adaptations | Deep | Combined repair + accessibility guidance |
| **Highlight Danger Zones** | Find visually risky or misleading areas | Deep | Identify low-contrast, glare, blended color issues |

### Model Tiers

- **Fast** (`gemini-3-flash-preview`): Quick responses, lower token limit (900), good for simple descriptions
- **Deep** (`gemini-3-flash-preview`): Longer responses, higher token limit (1200 for extended actions), better for detailed analysis

### Key files

| File | What it does |
|------|-------------|
| `AIAssistMode.jsx` | The UI — action buttons, result panel, voice toggle, loading states |
| `aiAssistConfig.js` | Defines all 5 actions: their prompts, model tiers, tone colors |
| `geminiVision.js` | Frontend request handler — decides whether to call the server or Gemini directly |
| `geminiVisionShared.js` | Shared utilities — prompt building, text sanitization, response validation |
| `api/gemini-vision.js` | Server-side Vercel Edge Function that securely calls Google Gemini |

### Text-to-Speech (Web Speech API)

The browser has a built-in speech engine (`window.speechSynthesis`). When the user clicks "Play Voice":
1. The AI response text is cleaned (extra newlines removed)
2. A `SpeechSynthesisUtterance` object is created with the text
3. The browser speaks it aloud at normal speed/pitch
4. Clicking again stops playback

---

## 6. How the AI Backend Works

### The Security Problem

We can't put the Google Gemini API key in the frontend code — anyone could open DevTools and steal it. So we use a **server-side proxy**.

### The Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Browser     │────▶│  /api/gemini-    │────▶│  Google Gemini   │
│  (React app) │◀────│  vision.js       │◀────│  API             │
│              │     │  (Vercel Edge)   │     │                  │
└─────────────┘     └──────────────────┘     └─────────────────┘
    Frontend             Backend                 External API
    (no API key)         (has API key)           (needs API key)
```

### Request Flow

1. **Frontend** (`geminiVision.js`):
   - Checks if running on localhost with `VITE_GEMINI_API_KEY` → calls Gemini directly
   - Otherwise sends a POST to `/api/gemini-vision` with the image + prompt

2. **Backend** (`api/gemini-vision.js`):
   - Reads `GEMINI_API_KEY` from server environment (NOT exposed to browser)
   - Builds the Gemini API request with the image and prompt
   - Forwards it to `generativelanguage.googleapis.com`
   - Returns the response text back to the frontend

3. **Response validation** (`geminiVisionShared.js`):
   - Checks if the response is too short or cut off mid-sentence
   - If yes, automatically retries with a stronger prompt ("Please provide a complete response")
   - Sanitizes markdown formatting (strips `**bold**`, `# headings`, `* bullets`)
   - Returns clean plain text

---

## 7. Key Algorithms

### Color Space Conversions
- **RGB → HSL**: Used for color naming (hue = color wheel position, saturation = vividness, lightness = brightness)
- **RGB → LAB**: Used for Delta-E comparison (perceptually uniform color space)
- **RGB → HSV**: Additional color representation for analysis output

### Daltonization (Colorblind Correction)
A 3-step process: simulate → find error → shift error into visible channels. Uses 3×3 matrices specific to each type of colorblindness.

### K-Means Clustering (Palette Extraction)
Groups similar pixels into k=5 clusters by iterating: assign pixels to nearest center → recalculate centers → repeat.

### Delta-E 2000 (Color Matching)
Industry-standard formula for measuring perceived color difference. Accounts for human vision quirks: we're more sensitive to hue changes in some ranges than others.

---

## 8. Environment Variables

| Variable | Where | Purpose |
|----------|-------|---------|
| `VITE_GEMINI_API_KEY` | `.env` (local only) | Allows direct Gemini calls during local development |
| `GEMINI_API_KEY` | Vercel dashboard | Used by the server-side route in production |
| `VITE_GEMINI_MODEL` | `.env` (optional) | Override the default Gemini model for all tiers |
| `VITE_GEMINI_FAST_MODEL` | `.env` (optional) | Override the "fast" tier model specifically |
| `VITE_GEMINI_DEEP_MODEL` | `.env` (optional) | Override the "deep" tier model specifically |

---

## 9. Tech Stack

| Technology | Used For |
|-----------|---------|
| **React 19** | UI framework — components, state management, rendering |
| **Vite** | Build tool — fast dev server, production bundling |
| **Tailwind CSS** | Styling — utility classes for the glassmorphism dark theme |
| **Lucide React** | Icons — clean vector icons for all buttons and UI elements |
| **HTML Canvas API** | Image rendering — pixel-level access for color picking and filters |
| **Web Speech API** | Text-to-speech — reads AI results aloud in the browser |
| **Google Gemini API** | AI image analysis — vision model that understands image content |
| **Vercel Edge Functions** | Server-side proxy — securely forwards requests to Gemini |

---

## Quick Reference: How to Explain Each Feature

### Color Analysis (1-liner)
"We draw the image on an HTML canvas, read the exact pixel color under your finger, then use a K-Means clustering algorithm to find the 5 most dominant colors in the image — all running locally in the browser with no server needed."

### Colorblind Assist (1-liner)
"We use daltonization — a mathematical technique that simulates what a colorblind person can't see, calculates the 'error' (the missing color info), and shifts it into colors they CAN see, all by transforming every pixel with a 3×3 matrix."

### AI Assist (1-liner)
"We securely send the image to Google's Gemini vision model through a server-side proxy that keeps the API key hidden, get back a plain-text analysis, sanitize it to remove any markdown formatting, and offer text-to-speech playback using the browser's built-in speech engine."
