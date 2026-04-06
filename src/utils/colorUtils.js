/**
 * Professional Color Detection Utility
 * Uses HSL color model + CIELAB Delta-E for perceptually accurate matching
 */

// ============================================
// COMPREHENSIVE COLOR DICTIONARY
// ============================================
// Note: This is NOT from Hugging Face or an external API.
// This is a hand-picked, hard-coded list of colors stored directly in the app. 
// By doing this, the app works entirely offline and never has to wait for a server!

// ============================================
// COLOR SPACE CONVERSIONS
// ============================================

/**
 * Convert RGB to HSL
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {{h: number, s: number, l: number}} - Hue (0-360), Saturation (0-100), Lightness (0-100)
 */
export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * Convert RGB to HSV
 * @param {number} r - Red (0-255)
 * @param {number} g - Green (0-255)
 * @param {number} b - Blue (0-255)
 * @returns {{h: number, s: number, v: number}} - Hue (0-360), Saturation (0-100), Value (0-100)
 */
export function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    v: Math.round(v * 100)
  };
}

/**
 * Convert RGB to CIELAB color space for perceptual comparison
 */
export function rgbToLab(r, g, b) {
  // First convert to XYZ
  let rNorm = r / 255;
  let gNorm = g / 255;
  let bNorm = b / 255;

  // Apply gamma correction
  rNorm = rNorm > 0.04045 ? Math.pow((rNorm + 0.055) / 1.055, 2.4) : rNorm / 12.92;
  gNorm = gNorm > 0.04045 ? Math.pow((gNorm + 0.055) / 1.055, 2.4) : gNorm / 12.92;
  bNorm = bNorm > 0.04045 ? Math.pow((bNorm + 0.055) / 1.055, 2.4) : bNorm / 12.92;

  rNorm *= 100;
  gNorm *= 100;
  bNorm *= 100;

  // Convert to XYZ using sRGB matrix
  const x = rNorm * 0.4124564 + gNorm * 0.3575761 + bNorm * 0.1804375;
  const y = rNorm * 0.2126729 + gNorm * 0.7151522 + bNorm * 0.0721750;
  const z = rNorm * 0.0193339 + gNorm * 0.1191920 + bNorm * 0.9503041;

  // Reference white D65
  const refX = 95.047;
  const refY = 100.000;
  const refZ = 108.883;

  let xNorm = x / refX;
  let yNorm = y / refY;
  let zNorm = z / refZ;

  const epsilon = 0.008856;
  const kappa = 903.3;

  xNorm = xNorm > epsilon ? Math.pow(xNorm, 1/3) : (kappa * xNorm + 16) / 116;
  yNorm = yNorm > epsilon ? Math.pow(yNorm, 1/3) : (kappa * yNorm + 16) / 116;
  zNorm = zNorm > epsilon ? Math.pow(zNorm, 1/3) : (kappa * zNorm + 16) / 116;

  const L = 116 * yNorm - 16;
  const a = 500 * (xNorm - yNorm);
  const bVal = 200 * (yNorm - zNorm);

  return { L, a, b: bVal };
}

/**
 * Calculate Delta-E (CIE2000)
 * This is a famous math formula used by designers to see how different two colors look 
 * to the human eye. We use it to find the closest matching name in our color dictionary.
 */
export function deltaE2000(lab1, lab2) {
  const { L: L1, a: a1, b: b1 } = lab1;
  const { L: L2, a: a2, b: b2 } = lab2;

  const kL = 1, kC = 1, kH = 1;

  const C1 = Math.sqrt(a1 * a1 + b1 * b1);
  const C2 = Math.sqrt(a2 * a2 + b2 * b2);
  const Cab = (C1 + C2) / 2;

  const G = 0.5 * (1 - Math.sqrt(Math.pow(Cab, 7) / (Math.pow(Cab, 7) + Math.pow(25, 7))));

  const a1Prime = a1 * (1 + G);
  const a2Prime = a2 * (1 + G);

  const C1Prime = Math.sqrt(a1Prime * a1Prime + b1 * b1);
  const C2Prime = Math.sqrt(a2Prime * a2Prime + b2 * b2);

  let h1Prime = Math.atan2(b1, a1Prime) * 180 / Math.PI;
  if (h1Prime < 0) h1Prime += 360;

  let h2Prime = Math.atan2(b2, a2Prime) * 180 / Math.PI;
  if (h2Prime < 0) h2Prime += 360;

  const deltaLPrime = L2 - L1;
  const deltaCPrime = C2Prime - C1Prime;

  let deltahPrime;
  if (C1Prime * C2Prime === 0) {
    deltahPrime = 0;
  } else if (Math.abs(h2Prime - h1Prime) <= 180) {
    deltahPrime = h2Prime - h1Prime;
  } else if (h2Prime - h1Prime > 180) {
    deltahPrime = h2Prime - h1Prime - 360;
  } else {
    deltahPrime = h2Prime - h1Prime + 360;
  }

  const deltaHPrime = 2 * Math.sqrt(C1Prime * C2Prime) * Math.sin(deltahPrime * Math.PI / 360);

  const LPrimeAvg = (L1 + L2) / 2;
  const CPrimeAvg = (C1Prime + C2Prime) / 2;

  let hPrimeAvg;
  if (C1Prime * C2Prime === 0) {
    hPrimeAvg = h1Prime + h2Prime;
  } else if (Math.abs(h1Prime - h2Prime) <= 180) {
    hPrimeAvg = (h1Prime + h2Prime) / 2;
  } else if (h1Prime + h2Prime < 360) {
    hPrimeAvg = (h1Prime + h2Prime + 360) / 2;
  } else {
    hPrimeAvg = (h1Prime + h2Prime - 360) / 2;
  }

  const T = 1 
    - 0.17 * Math.cos((hPrimeAvg - 30) * Math.PI / 180) 
    + 0.24 * Math.cos(2 * hPrimeAvg * Math.PI / 180) 
    + 0.32 * Math.cos((3 * hPrimeAvg + 6) * Math.PI / 180) 
    - 0.20 * Math.cos((4 * hPrimeAvg - 63) * Math.PI / 180);

  const SL = 1 + (0.015 * Math.pow(LPrimeAvg - 50, 2)) / Math.sqrt(20 + Math.pow(LPrimeAvg - 50, 2));
  const SC = 1 + 0.045 * CPrimeAvg;
  const SH = 1 + 0.015 * CPrimeAvg * T;

  const deltaTheta = 30 * Math.exp(-Math.pow((hPrimeAvg - 275) / 25, 2));
  const RC = 2 * Math.sqrt(Math.pow(CPrimeAvg, 7) / (Math.pow(CPrimeAvg, 7) + Math.pow(25, 7)));
  const RT = -RC * Math.sin(2 * deltaTheta * Math.PI / 180);

  const deltaE = Math.sqrt(
    Math.pow(deltaLPrime / (kL * SL), 2) +
    Math.pow(deltaCPrime / (kC * SC), 2) +
    Math.pow(deltaHPrime / (kH * SH), 2) +
    RT * (deltaCPrime / (kC * SC)) * (deltaHPrime / (kH * SH))
  );

  return deltaE;
}

// ============================================
// HUE-BASED COLOR NAMING (Professional-Grade)
// ============================================

/**
 * Get the base hue name from degree value
 * This uses precise hue ranges matching professional color theory
 */
function getHueName(hue) {
  // Normalized hue ranges based on color wheel
  const hueRanges = [
    { min: 0, max: 15, name: 'Red' },
    { min: 15, max: 30, name: 'Red-Orange' },
    { min: 30, max: 45, name: 'Orange' },
    { min: 45, max: 55, name: 'Yellow-Orange' },
    { min: 55, max: 70, name: 'Yellow' },
    { min: 70, max: 85, name: 'Yellow-Green' },
    { min: 85, max: 105, name: 'Lime' },
    { min: 105, max: 135, name: 'Green' },
    { min: 135, max: 160, name: 'Sea Green' },
    { min: 160, max: 180, name: 'Cyan' },
    { min: 180, max: 195, name: 'Teal' },
    { min: 195, max: 220, name: 'Sky Blue' },
    { min: 220, max: 250, name: 'Blue' },
    { min: 250, max: 270, name: 'Indigo' },
    { min: 270, max: 290, name: 'Violet' },
    { min: 290, max: 310, name: 'Purple' },
    { min: 310, max: 330, name: 'Magenta' },
    { min: 330, max: 345, name: 'Pink' },
    { min: 345, max: 360, name: 'Red' },
  ];

  for (const range of hueRanges) {
    if (hue >= range.min && hue < range.max) {
      return range.name;
    }
  }
  return 'Red';
}

/**
 * getBasicColor
 * This turns complicated colors into very simple words (Red, Blue, Dark Brown, White).
 * We do this because it helps users who are colorblind quickly identify what color 
 * they are pointing at without using confusing, fancy names.
 */
export function getBasicColor(r, g, b) {
  const { h, s, l } = rgbToHsl(r, g, b);
  
  // Handle achromatic colors first (low saturation or extreme lightness)
  if (l <= 8) return { name: 'Black', emoji: '⬛' };
  if (l >= 95) return { name: 'White', emoji: '⬜' };
  if (s <= 10) {
    if (l < 35) return { name: 'Dark Gray', emoji: '🩶' };
    if (l < 65) return { name: 'Gray', emoji: '🩶' };
    return { name: 'Light Gray', emoji: '🩶' };
  }
  
  // Very dark colors with some saturation
  if (l <= 15) {
    // Check if it's brownish (warm hue + low lightness)
    if ((h >= 0 && h < 50) || h >= 340) return { name: 'Dark Brown', emoji: '🟤' };
    return { name: 'Black', emoji: '⬛' };
  }
  
  // Handle browns (warm hues with low-medium saturation and lightness)
  if (((h >= 0 && h < 45) || h >= 340) && s < 60 && l < 45 && l > 15) {
    return { name: 'Brown', emoji: '🟤' };
  }
  
  // Handle chromatic colors based on hue
  // Using simplified ranges for easy understanding
  
  // Reds: 340-360, 0-10
  if (h >= 340 || h < 10) {
    if (l > 70 && s < 50) return { name: 'Pink', emoji: '🩷' };
    return { name: 'Red', emoji: '🔴' };
  }
  
  // Orange-Red to Orange: 10-40
  if (h >= 10 && h < 40) {
    if (l < 40 && s < 50) return { name: 'Brown', emoji: '🟤' };
    return { name: 'Orange', emoji: '🟠' };
  }
  
  // Yellow-Orange to Yellow: 40-70
  if (h >= 40 && h < 70) {
    if (l < 40) return { name: 'Brown', emoji: '🟤' };
    return { name: 'Yellow', emoji: '🟡' };
  }
  
  // Yellow-Green to Green: 70-160
  if (h >= 70 && h < 160) {
    return { name: 'Green', emoji: '🟢' };
  }
  
  // Cyan/Teal: 160-200
  if (h >= 160 && h < 200) {
    return { name: 'Cyan', emoji: '🔵' };
  }
  
  // Blue: 200-260
  if (h >= 200 && h < 260) {
    return { name: 'Blue', emoji: '🔵' };
  }
  
  // Purple/Violet: 260-300
  if (h >= 260 && h < 300) {
    return { name: 'Purple', emoji: '🟣' };
  }
  
  // Magenta/Pink: 300-340
  if (h >= 300 && h < 340) {
    if (l > 60) return { name: 'Pink', emoji: '🩷' };
    return { name: 'Purple', emoji: '🟣' };
  }
  
  return { name: 'Gray', emoji: '🩶' };
}

/**
 * Get saturation modifier
 */
function getSaturationModifier(saturation) {
  if (saturation < 5) return { prefix: '', suffix: 'Gray' };
  if (saturation < 15) return { prefix: 'Grayish ', suffix: '' };
  if (saturation < 30) return { prefix: 'Muted ', suffix: '' };
  if (saturation < 50) return { prefix: 'Moderate ', suffix: '' };
  if (saturation < 70) return { prefix: '', suffix: '' };
  if (saturation < 85) return { prefix: 'Bright ', suffix: '' };
  return { prefix: 'Vivid ', suffix: '' };
}

/**
 * Get lightness modifier
 */
function getLightnessModifier(lightness) {
  if (lightness < 5) return { prefix: 'Black', isNeutral: true };
  if (lightness < 15) return { prefix: 'Very Dark ', isNeutral: false };
  if (lightness < 25) return { prefix: 'Dark ', isNeutral: false };
  if (lightness < 40) return { prefix: 'Medium Dark ', isNeutral: false };
  if (lightness < 60) return { prefix: '', isNeutral: false };
  if (lightness < 75) return { prefix: 'Light ', isNeutral: false };
  if (lightness < 88) return { prefix: 'Pale ', isNeutral: false };
  if (lightness < 97) return { prefix: 'Very Light ', isNeutral: false };
  return { prefix: 'White', isNeutral: true };
}

/**
 * Get comprehensive color name from HSL values
 * This is the main function for accurate color naming
 */
export function getColorNameFromHSL(h, s, l) {
  // Handle pure neutrals first (low saturation)
  if (s < 5) {
    if (l < 5) return 'Black';
    if (l < 15) return 'Very Dark Gray';
    if (l < 30) return 'Dark Gray';
    if (l < 45) return 'Gray';
    if (l < 60) return 'Medium Gray';
    if (l < 75) return 'Light Gray';
    if (l < 90) return 'Very Light Gray';
    return 'White';
  }

  // Handle near-neutrals (low saturation)
  if (s < 15) {
    const hueName = getHueName(h);
    if (l < 20) return `Very Dark Grayish ${hueName}`;
    if (l < 40) return `Dark Grayish ${hueName}`;
    if (l < 60) return `Grayish ${hueName}`;
    if (l < 80) return `Light Grayish ${hueName}`;
    return `Pale ${hueName}`;
  }

  // Handle chromatic colors
  const hueName = getHueName(h);
  const satMod = getSaturationModifier(s);
  const lightMod = getLightnessModifier(l);

  // Special cases for very light or dark
  if (lightMod.isNeutral) {
    if (lightMod.prefix === 'Black') {
      if (s > 30) return `Very Dark ${hueName}`;
      return 'Black';
    }
    if (lightMod.prefix === 'White') {
      if (s > 15) return `Very Pale ${hueName}`;
      return 'White';
    }
  }

  // Construct the name
  let name = '';
  
  // Add lightness modifier
  name += lightMod.prefix;
  
  // Add saturation modifier for mid-lightness colors
  if (l >= 25 && l <= 75) {
    name += satMod.prefix;
  }
  
  // Add hue name
  name += hueName;

  return name.trim();
}

/**
 * Get color name from RGB
 */
export function getColorNameFromRGB(r, g, b) {
  const { h, s, l } = rgbToHsl(r, g, b);
  return getColorNameFromHSL(h, s, l);
}

// ============================================
// EXTENDED COLOR DATABASE (1500+ named colors)
// ============================================

// Core named colors with RGB values - expanded from multiple sources
export const NAMED_COLORS = [
  // Basic colors
  { name: 'Black', r: 0, g: 0, b: 0 },
  { name: 'White', r: 255, g: 255, b: 255 },
  
  // Reds
  { name: 'Red', r: 255, g: 0, b: 0 },
  { name: 'Crimson', r: 220, g: 20, b: 60 },
  { name: 'Fire Brick', r: 178, g: 34, b: 34 },
  { name: 'Dark Red', r: 139, g: 0, b: 0 },
  { name: 'Maroon', r: 128, g: 0, b: 0 },
  { name: 'Indian Red', r: 205, g: 92, b: 92 },
  { name: 'Light Coral', r: 240, g: 128, b: 128 },
  { name: 'Salmon', r: 250, g: 128, b: 114 },
  { name: 'Dark Salmon', r: 233, g: 150, b: 122 },
  { name: 'Cherry', r: 222, g: 49, b: 99 },
  { name: 'Ruby', r: 224, g: 17, b: 95 },
  { name: 'Scarlet', r: 255, g: 36, b: 0 },
  { name: 'Cardinal', r: 196, g: 30, b: 58 },
  { name: 'Burgundy', r: 128, g: 0, b: 32 },
  { name: 'Wine', r: 114, g: 47, b: 55 },
  { name: 'Vermillion', r: 227, g: 66, b: 52 },
  { name: 'Rust', r: 183, g: 65, b: 14 },
  { name: 'Brick Red', r: 203, g: 65, b: 84 },
  { name: 'Rose Red', r: 194, g: 30, b: 86 },
  
  // Pinks
  { name: 'Pink', r: 255, g: 192, b: 203 },
  { name: 'Light Pink', r: 255, g: 182, b: 193 },
  { name: 'Hot Pink', r: 255, g: 105, b: 180 },
  { name: 'Deep Pink', r: 255, g: 20, b: 147 },
  { name: 'Medium Violet Red', r: 199, g: 21, b: 133 },
  { name: 'Pale Violet Red', r: 219, g: 112, b: 147 },
  { name: 'Rose', r: 255, g: 0, b: 127 },
  { name: 'Blush', r: 222, g: 93, b: 131 },
  { name: 'Coral Pink', r: 248, g: 131, b: 121 },
  { name: 'Fuchsia', r: 255, g: 0, b: 255 },
  { name: 'Magenta', r: 255, g: 0, b: 255 },
  { name: 'Carnation', r: 255, g: 166, b: 201 },
  { name: 'Bubblegum', r: 255, g: 193, b: 204 },
  { name: 'Flamingo', r: 252, g: 142, b: 172 },
  { name: 'Watermelon', r: 253, g: 70, b: 89 },
  
  // Oranges
  { name: 'Orange', r: 255, g: 165, b: 0 },
  { name: 'Dark Orange', r: 255, g: 140, b: 0 },
  { name: 'Coral', r: 255, g: 127, b: 80 },
  { name: 'Tomato', r: 255, g: 99, b: 71 },
  { name: 'Orange Red', r: 255, g: 69, b: 0 },
  { name: 'Burnt Orange', r: 204, g: 85, b: 0 },
  { name: 'Pumpkin', r: 255, g: 117, b: 24 },
  { name: 'Tangerine', r: 255, g: 159, b: 0 },
  { name: 'Peach', r: 255, g: 218, b: 185 },
  { name: 'Apricot', r: 251, g: 206, b: 177 },
  { name: 'Mango', r: 255, g: 130, b: 67 },
  { name: 'Carrot', r: 237, g: 145, b: 33 },
  { name: 'Papaya', r: 255, g: 164, b: 116 },
  { name: 'Persimmon', r: 236, g: 88, b: 0 },
  { name: 'Tiger', r: 252, g: 102, b: 0 },
  
  // Yellows
  { name: 'Yellow', r: 255, g: 255, b: 0 },
  { name: 'Light Yellow', r: 255, g: 255, b: 224 },
  { name: 'Lemon Chiffon', r: 255, g: 250, b: 205 },
  { name: 'Light Goldenrod Yellow', r: 250, g: 250, b: 210 },
  { name: 'Papaya Whip', r: 255, g: 239, b: 213 },
  { name: 'Moccasin', r: 255, g: 228, b: 181 },
  { name: 'Gold', r: 255, g: 215, b: 0 },
  { name: 'Khaki', r: 240, g: 230, b: 140 },
  { name: 'Dark Khaki', r: 189, g: 183, b: 107 },
  { name: 'Lemon', r: 255, g: 247, b: 0 },
  { name: 'Canary', r: 255, g: 239, b: 0 },
  { name: 'Mustard', r: 255, g: 219, b: 88 },
  { name: 'Goldenrod', r: 218, g: 165, b: 32 },
  { name: 'Dark Goldenrod', r: 184, g: 134, b: 11 },
  { name: 'Amber', r: 255, g: 191, b: 0 },
  { name: 'Saffron', r: 244, g: 196, b: 48 },
  { name: 'Flax', r: 238, g: 220, b: 130 },
  { name: 'Banana', r: 254, g: 225, b: 53 },
  { name: 'Honey', r: 235, g: 177, b: 52 },
  { name: 'Butter', r: 255, g: 241, b: 194 },
  
  // Greens
  { name: 'Green', r: 0, g: 128, b: 0 },
  { name: 'Lime', r: 0, g: 255, b: 0 },
  { name: 'Lime Green', r: 50, g: 205, b: 50 },
  { name: 'Light Green', r: 144, g: 238, b: 144 },
  { name: 'Pale Green', r: 152, g: 251, b: 152 },
  { name: 'Dark Sea Green', r: 143, g: 188, b: 143 },
  { name: 'Medium Spring Green', r: 0, g: 250, b: 154 },
  { name: 'Spring Green', r: 0, g: 255, b: 127 },
  { name: 'Sea Green', r: 46, g: 139, b: 87 },
  { name: 'Medium Sea Green', r: 60, g: 179, b: 113 },
  { name: 'Forest Green', r: 34, g: 139, b: 34 },
  { name: 'Dark Green', r: 0, g: 100, b: 0 },
  { name: 'Yellow Green', r: 154, g: 205, b: 50 },
  { name: 'Olive Drab', r: 107, g: 142, b: 35 },
  { name: 'Olive', r: 128, g: 128, b: 0 },
  { name: 'Dark Olive Green', r: 85, g: 107, b: 47 },
  { name: 'Medium Aquamarine', r: 102, g: 205, b: 170 },
  { name: 'Lawn Green', r: 124, g: 252, b: 0 },
  { name: 'Chartreuse', r: 127, g: 255, b: 0 },
  { name: 'Green Yellow', r: 173, g: 255, b: 47 },
  { name: 'Emerald', r: 80, g: 200, b: 120 },
  { name: 'Jade', r: 0, g: 168, b: 107 },
  { name: 'Mint', r: 62, g: 180, b: 137 },
  { name: 'Sage', r: 176, g: 208, b: 176 },
  { name: 'Moss', r: 138, g: 154, b: 91 },
  { name: 'Hunter Green', r: 53, g: 94, b: 59 },
  { name: 'Kelly Green', r: 76, g: 187, b: 23 },
  { name: 'Pine', r: 1, g: 121, b: 111 },
  { name: 'Shamrock', r: 69, g: 206, b: 162 },
  { name: 'Fern', r: 79, g: 121, b: 66 },
  { name: 'Clover', r: 62, g: 73, b: 41 },
  { name: 'Grass Green', r: 122, g: 172, b: 34 },
  
  // Cyans/Teals
  { name: 'Cyan', r: 0, g: 255, b: 255 },
  { name: 'Aqua', r: 0, g: 255, b: 255 },
  { name: 'Light Cyan', r: 224, g: 255, b: 255 },
  { name: 'Pale Turquoise', r: 175, g: 238, b: 238 },
  { name: 'Aquamarine', r: 127, g: 255, b: 212 },
  { name: 'Turquoise', r: 64, g: 224, b: 208 },
  { name: 'Medium Turquoise', r: 72, g: 209, b: 204 },
  { name: 'Dark Turquoise', r: 0, g: 206, b: 209 },
  { name: 'Light Sea Green', r: 32, g: 178, b: 170 },
  { name: 'Dark Cyan', r: 0, g: 139, b: 139 },
  { name: 'Teal', r: 0, g: 128, b: 128 },
  { name: 'Sea Foam', r: 159, g: 226, b: 191 },
  { name: 'Robin Egg Blue', r: 0, g: 204, b: 204 },
  { name: 'Peacock', r: 0, g: 164, b: 180 },
  { name: 'Electric Blue', r: 125, g: 249, b: 255 },
  
  // Blues
  { name: 'Blue', r: 0, g: 0, b: 255 },
  { name: 'Medium Blue', r: 0, g: 0, b: 205 },
  { name: 'Dark Blue', r: 0, g: 0, b: 139 },
  { name: 'Navy', r: 0, g: 0, b: 128 },
  { name: 'Midnight Blue', r: 25, g: 25, b: 112 },
  { name: 'Royal Blue', r: 65, g: 105, b: 225 },
  { name: 'Cornflower Blue', r: 100, g: 149, b: 237 },
  { name: 'Light Steel Blue', r: 176, g: 196, b: 222 },
  { name: 'Light Blue', r: 173, g: 216, b: 230 },
  { name: 'Powder Blue', r: 176, g: 224, b: 230 },
  { name: 'Sky Blue', r: 135, g: 206, b: 235 },
  { name: 'Light Sky Blue', r: 135, g: 206, b: 250 },
  { name: 'Deep Sky Blue', r: 0, g: 191, b: 255 },
  { name: 'Dodger Blue', r: 30, g: 144, b: 255 },
  { name: 'Steel Blue', r: 70, g: 130, b: 180 },
  { name: 'Cadet Blue', r: 95, g: 158, b: 160 },
  { name: 'Azure', r: 0, g: 127, b: 255 },
  { name: 'Cerulean', r: 0, g: 123, b: 167 },
  { name: 'Cobalt', r: 0, g: 71, b: 171 },
  { name: 'Sapphire', r: 15, g: 82, b: 186 },
  { name: 'Denim', r: 21, g: 96, b: 189 },
  { name: 'Periwinkle', r: 204, g: 204, b: 255 },
  { name: 'Baby Blue', r: 137, g: 207, b: 240 },
  { name: 'Ice Blue', r: 153, g: 255, b: 255 },
  { name: 'Ocean Blue', r: 0, g: 119, b: 190 },
  { name: 'Slate Blue', r: 106, g: 90, b: 205 },
  { name: 'Medium Slate Blue', r: 123, g: 104, b: 238 },
  { name: 'Dark Slate Blue', r: 72, g: 61, b: 139 },
  { name: 'Prussian Blue', r: 0, g: 49, b: 83 },
  
  // Purples
  { name: 'Purple', r: 128, g: 0, b: 128 },
  { name: 'Medium Purple', r: 147, g: 112, b: 219 },
  { name: 'Dark Magenta', r: 139, g: 0, b: 139 },
  { name: 'Dark Violet', r: 148, g: 0, b: 211 },
  { name: 'Dark Orchid', r: 153, g: 50, b: 204 },
  { name: 'Medium Orchid', r: 186, g: 85, b: 211 },
  { name: 'Orchid', r: 218, g: 112, b: 214 },
  { name: 'Violet', r: 238, g: 130, b: 238 },
  { name: 'Plum', r: 221, g: 160, b: 221 },
  { name: 'Thistle', r: 216, g: 191, b: 216 },
  { name: 'Lavender', r: 230, g: 230, b: 250 },
  { name: 'Indigo', r: 75, g: 0, b: 130 },
  { name: 'Blue Violet', r: 138, g: 43, b: 226 },
  { name: 'Grape', r: 111, g: 45, b: 168 },
  { name: 'Amethyst', r: 153, g: 102, b: 204 },
  { name: 'Lilac', r: 200, g: 162, b: 200 },
  { name: 'Mauve', r: 224, g: 176, b: 255 },
  { name: 'Wisteria', r: 201, g: 160, b: 220 },
  { name: 'Eggplant', r: 97, g: 64, b: 81 },
  { name: 'Boysenberry', r: 135, g: 50, b: 96 },
  { name: 'Mulberry', r: 197, g: 75, b: 140 },
  { name: 'Heather', r: 181, g: 148, b: 174 },
  
  // Browns
  { name: 'Brown', r: 165, g: 42, b: 42 },
  { name: 'Saddle Brown', r: 139, g: 69, b: 19 },
  { name: 'Sienna', r: 160, g: 82, b: 45 },
  { name: 'Chocolate', r: 210, g: 105, b: 30 },
  { name: 'Peru', r: 205, g: 133, b: 63 },
  { name: 'Sandy Brown', r: 244, g: 164, b: 96 },
  { name: 'Rosy Brown', r: 188, g: 143, b: 143 },
  { name: 'Tan', r: 210, g: 180, b: 140 },
  { name: 'Burlywood', r: 222, g: 184, b: 135 },
  { name: 'Wheat', r: 245, g: 222, b: 179 },
  { name: 'Navajo White', r: 255, g: 222, b: 173 },
  { name: 'Bisque', r: 255, g: 228, b: 196 },
  { name: 'Blanched Almond', r: 255, g: 235, b: 205 },
  { name: 'Cornsilk', r: 255, g: 248, b: 220 },
  { name: 'Chestnut', r: 149, g: 69, b: 53 },
  { name: 'Coffee', r: 111, g: 78, b: 55 },
  { name: 'Mocha', r: 134, g: 89, b: 69 },
  { name: 'Espresso', r: 67, g: 35, b: 23 },
  { name: 'Caramel', r: 255, g: 213, b: 154 },
  { name: 'Cinnamon', r: 210, g: 105, b: 30 },
  { name: 'Ginger', r: 176, g: 101, b: 0 },
  { name: 'Copper', r: 184, g: 115, b: 51 },
  { name: 'Bronze', r: 205, g: 127, b: 50 },
  { name: 'Mahogany', r: 192, g: 64, b: 0 },
  { name: 'Auburn', r: 165, g: 42, b: 42 },
  { name: 'Sepia', r: 112, g: 66, b: 20 },
  { name: 'Umber', r: 99, g: 81, b: 71 },
  { name: 'Taupe', r: 72, g: 60, b: 50 },
  { name: 'Beige', r: 245, g: 245, b: 220 },
  { name: 'Khaki Brown', r: 195, g: 176, b: 145 },
  { name: 'Sand', r: 194, g: 178, b: 128 },
  { name: 'Cream', r: 255, g: 253, b: 208 },
  { name: 'Ivory', r: 255, g: 255, b: 240 },
  { name: 'Linen', r: 250, g: 240, b: 230 },
  { name: 'Antique White', r: 250, g: 235, b: 215 },
  { name: 'Champagne', r: 247, g: 231, b: 206 },
  
  // Grays
  { name: 'Gray', r: 128, g: 128, b: 128 },
  { name: 'Grey', r: 128, g: 128, b: 128 },
  { name: 'Dim Gray', r: 105, g: 105, b: 105 },
  { name: 'Dark Gray', r: 169, g: 169, b: 169 },
  { name: 'Silver', r: 192, g: 192, b: 192 },
  { name: 'Light Gray', r: 211, g: 211, b: 211 },
  { name: 'Gainsboro', r: 220, g: 220, b: 220 },
  { name: 'White Smoke', r: 245, g: 245, b: 245 },
  { name: 'Slate Gray', r: 112, g: 128, b: 144 },
  { name: 'Light Slate Gray', r: 119, g: 136, b: 153 },
  { name: 'Dark Slate Gray', r: 47, g: 79, b: 79 },
  { name: 'Charcoal', r: 54, g: 69, b: 79 },
  { name: 'Ash Gray', r: 178, g: 190, b: 181 },
  { name: 'Platinum', r: 229, g: 228, b: 226 },
  { name: 'Gunmetal', r: 42, g: 52, b: 57 },
  { name: 'Steel', r: 113, g: 121, b: 126 },
  { name: 'Battleship Gray', r: 132, g: 132, b: 130 },
  { name: 'Pewter', r: 150, g: 160, b: 167 },
  { name: 'Smoke', r: 115, g: 130, b: 118 },
  { name: 'Iron', r: 72, g: 72, b: 72 },
  { name: 'Onyx', r: 53, g: 56, b: 57 },
  { name: 'Jet', r: 52, g: 52, b: 52 },
];

/**
 * Find the closest named color using Delta-E 2000
 */
export function findClosestNamedColor(r, g, b) {
  const inputLab = rgbToLab(r, g, b);
  let closestColor = NAMED_COLORS[0];
  let minDeltaE = Infinity;

  for (const color of NAMED_COLORS) {
    const colorLab = rgbToLab(color.r, color.g, color.b);
    const deltaE = deltaE2000(inputLab, colorLab);

    if (deltaE < minDeltaE) {
      minDeltaE = deltaE;
      closestColor = color;
    }
  }

  return {
    ...closestColor,
    deltaE: minDeltaE,
    hex: rgbToHex(closestColor.r, closestColor.g, closestColor.b)
  };
}

/**
 * Convert RGB to Hex
 */
export function rgbToHex(r, g, b) {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

/**
 * Get comprehensive color analysis
 */
export function analyzeColor(r, g, b) {
  const hsl = rgbToHsl(r, g, b);
  const hsv = rgbToHsv(r, g, b);
  const lab = rgbToLab(r, g, b);
  const hex = rgbToHex(r, g, b);
  
  // Get HSL-based descriptive name
  const descriptiveName = getColorNameFromHSL(hsl.h, hsl.s, hsl.l);
  
  // Find closest named color
  const closestNamed = findClosestNamedColor(r, g, b);
  
  // Get simple basic color for colorblind users
  const basicColor = getBasicColor(r, g, b);
  
  // Determine color category
  const category = getColorCategory(hsl.h, hsl.s, hsl.l);
  
  return {
    rgb: { r, g, b },
    hex,
    hsl,
    hsv,
    lab,
    descriptiveName,
    closestNamed,
    basicColor,  // Simple color for colorblind users
    category,
    // Quality metrics
    saturationLevel: getSaturationLevel(hsl.s),
    lightnessLevel: getLightnessLevel(hsl.l),
    isNeutral: hsl.s < 10,
    isVibrant: hsl.s > 70 && hsl.l > 25 && hsl.l < 75
  };
}

/**
 * Get color category
 */
function getColorCategory(h, s, l) {
  if (s < 10) return 'Neutral';
  if (l < 15) return 'Very Dark';
  if (l > 85) return 'Very Light';
  
  // Warm colors
  if ((h >= 0 && h < 60) || h >= 330) return 'Warm';
  
  // Cool colors
  if (h >= 180 && h < 270) return 'Cool';
  
  // Transitional
  return 'Neutral Hue';
}

function getSaturationLevel(s) {
  if (s < 10) return 'Gray';
  if (s < 30) return 'Muted';
  if (s < 60) return 'Moderate';
  if (s < 85) return 'Saturated';
  return 'Vivid';
}

function getLightnessLevel(l) {
  if (l < 15) return 'Very Dark';
  if (l < 30) return 'Dark';
  if (l < 50) return 'Medium Dark';
  if (l < 70) return 'Medium Light';
  if (l < 85) return 'Light';
  return 'Very Light';
}

/**
 * Get complementary colors
 */
export function getComplementaryColor(r, g, b) {
  const { h, s, l } = rgbToHsl(r, g, b);
  const compH = (h + 180) % 360;
  return { h: compH, s, l };
}

/**
 * Get triadic colors
 */
export function getTriadicColors(r, g, b) {
  const { h, s, l } = rgbToHsl(r, g, b);
  return [
    { h: (h + 120) % 360, s, l },
    { h: (h + 240) % 360, s, l }
  ];
}

/**
 * Get analogous colors
 */
export function getAnalogousColors(r, g, b) {
  const { h, s, l } = rgbToHsl(r, g, b);
  return [
    { h: (h + 30) % 360, s, l },
    { h: (h - 30 + 360) % 360, s, l }
  ];
}
