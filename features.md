# ColorVision Application Features

Below is a comprehensive summary of the features available in the ColorVision application, organized into bullet points. This document can be provided to an AI presentation generator to create a slide deck.

## Core Application Workflow
*   **Intuitive Navigation System:** A streamlined four-step workflow consisting of a Home Screen, Camera View, Image Preview, and specialized Analysis/Assist modes.
*   **Real-time Image Parsing:** The app leverages the device camera to instantly capture imagery for immediate color processing.

## Image Capture & Management
*   **Integrated Camera Interface:** Users can access their device's user-facing camera directly through the web application.
*   **Live Preview & Interactivity:** A responsive live video feed (`<video>` element) displays the camera stream with inline playback.
*   **Snapshot Functionality:** Users can take a photo with a simulated "flash" effect for visual feedback.
*   **Capture Controls:** Contains a prominent "Capture" button for taking photos and a newly implemented "Stop" button that successfully routes the user back to the Home Screen.
*   **Image Preview & Routing:** After capturing an image, users land on a Preview screen where they can choose to either analyze the colors, use colorblind assistance tools, or retake the photo.

## Advanced Color Analysis Mode
*   **Interactive Image Canvas:** Displays the captured image on an interactive, responsive HTML5 canvas.
*   **Precision Color Picking:** Users can tap or click anywhere on the image to extract the exact color data of a specific pixel.
*   **Magnifying Glass UI (Loupe):** Features a sleek hover/drag magnifier that provides a 5x5 pixel zoomed-in view, allowing for pinpoint accuracy when selecting colors.
*   **Comprehensive Color Data Extraction:**
    *   **Basic Color Naming:** Translates complex colors into simple, universally understood names (e.g., "Red", "Blue", "Dark Brown") accompanied by an intuitive Emoji (e.g., 🔴, 🔵, 🟤).
    *   **Precise Descriptive Naming:** Generates professional-grade HSL-based descriptive names (e.g., "Dark Grayish Blue").
    *   **Closest Match:** Compares the selected pixel against a database of over 1,500 named colors using Delta-E (CIE2000) perceptual matching algorithms.
    *   **Technical Values:** Displays the exact RGB (Red, Green, Blue) and HSL (Hue, Saturation, Lightness) values for developer and design use.
    *   **Hex Code Generation:** Provides the standard Hexadecimal color code.
*   **Dominant Color Extraction (Palette Generation):** Uses the K-Means clustering algorithm to automatically sample the image and generate a palette of the 5 most dominant colors present in the photograph.
*   **Dynamic Zoom Controls:** Includes a modern UI control panel allowing users to zoom the image in and out (from 0.5x to 3.0x scale) with a visual progress bar and a quick reset button.

## Colorblind Assistance Mode
*   **Real-time Daltonization Filters:** Employs advanced mathematical matrices to shift confusing colors into distinguishable spectrums based on specific types of color vision deficiencies.
*   **Support for Multiple Deficiencies:** 
    *   Protanopia (Red-Blind)
    *   Deuteranopia (Green-Blind)
    *   Tritanopia (Blue-Blind)
*   **Three Modes of Operation:**
    *   **Assist Mode ("Helps you see colors"):** Shifts overlapping hues into distinguishable ranges for the specific colorblind profile.
    *   **Enhance Mode ("Maximum Distinction"):** Dramatically boosts saturation and shifts specific color channels to maximize contrast. Includes a general "High Contrast" mode.
    *   **Simulate Mode ("For Education"):** Simulates how people with Protanopia, Deuteranopia, or Tritanopia perceive the uploaded image, useful for designers testing image accessibility.
*   **Interactive Visual Feedback:** Uses Web Workers or synchronous canvas manipulation to re-render the image instantly when a new filter is selected.
*   **Reset Functionality:** A clear, easy-to-use "Reset to Original" button instantly removes all applied color transformations.

## Technical Architecture & AI Integration
*   **React Framework:** Built using modern React concepts, utilizing Hooks (`useState`, `useEffect`, `useRef`, `useCallback`) for state and lifecycle management.
*   **Vite Tooling:** Configured with Vite for extremely fast Hot Module Replacement (HMR) and optimized production builds.
*   **Tailwind CSS:** Fully styled using Tailwind CSS for a modern, responsive, "glassmorphic," and dark-mode default aesthetic.
*   **Pure Client-Side Processing:** All color analysis, K-Means clustering, and matrix Daltonization happen entirely in the browser (client-side) ensuring maximum privacy and speed without requiring backend API calls.
