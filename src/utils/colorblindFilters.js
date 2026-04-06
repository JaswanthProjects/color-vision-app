/**
 * Colorblind Assistance Filters
 * 
 * This file contains the math used to change colors in a picture.
 * It shifts colors that look the same to a colorblind person into colors they can tell apart.
 */

// Color blindness simulation matrices (how colorblind people see)
const COLORBLIND_MATRICES = {
  // Protanopia (red-blind) - most common in males
  protanopia: [
    [0.567, 0.433, 0],
    [0.558, 0.442, 0],
    [0, 0.242, 0.758]
  ],
  // Deuteranopia (green-blind) - most common type
  deuteranopia: [
    [0.625, 0.375, 0],
    [0.7, 0.3, 0],
    [0, 0.3, 0.7]
  ],
  // Tritanopia (blue-blind) - rare
  tritanopia: [
    [0.95, 0.05, 0],
    [0, 0.433, 0.567],
    [0, 0.475, 0.525]
  ]
};

/**
 * Apply a color transformation matrix to RGB values
 */
function applyMatrix(r, g, b, matrix) {
  const newR = matrix[0][0] * r + matrix[0][1] * g + matrix[0][2] * b;
  const newG = matrix[1][0] * r + matrix[1][1] * g + matrix[1][2] * b;
  const newB = matrix[2][0] * r + matrix[2][1] * g + matrix[2][2] * b;
  
  return [
    Math.max(0, Math.min(255, Math.round(newR))),
    Math.max(0, Math.min(255, Math.round(newG))),
    Math.max(0, Math.min(255, Math.round(newB)))
  ];
}

/**
 * Daltonization - The Magic Math
 * It figures out what colors a person CAN'T see in the picture,
 * and shifts those hidden details into colors they CAN see.
 */
function daltonize(r, g, b, type) {
  const matrix = COLORBLIND_MATRICES[type];
  if (!matrix) return [r, g, b];
  
  // Simulate how colorblind person sees this color
  const [simR, simG, simB] = applyMatrix(r, g, b, matrix);
  
  // Calculate the error (what they're missing)
  const errR = r - simR;
  const errG = g - simG;
  const errB = b - simB;
  
  // Shift the error into visible spectrum based on colorblind type
  let shiftR = 0, shiftG = 0, shiftB = 0;
  
  if (type === 'protanopia' || type === 'deuteranopia') {
    // For red/green blindness, shift to blue channel
    shiftR = 0;
    shiftG = 0.7 * errG + 0.7 * errR;
    shiftB = 0.7 * errB + 0.7 * errR;
  } else if (type === 'tritanopia') {
    // For blue blindness, shift to red/green channels
    shiftR = 0.7 * errR + 0.7 * errB;
    shiftG = 0.7 * errG + 0.7 * errB;
    shiftB = 0;
  }
  
  return [
    Math.max(0, Math.min(255, Math.round(r + shiftR))),
    Math.max(0, Math.min(255, Math.round(g + shiftG))),
    Math.max(0, Math.min(255, Math.round(b + shiftB)))
  ];
}

/**
 * Enhanced color mode - increases saturation and shifts hues
 * to make colors more distinguishable
 */
function enhanceColors(r, g, b, type) {
  // Convert to HSL for manipulation
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
      case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
      case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
    }
  }
  
  // Enhance based on colorblind type
  let newH = h * 360;
  let newS = s;
  
  if (type === 'protanopia' || type === 'deuteranopia') {
    // Shift reds and greens to be more distinct
    if (newH >= 0 && newH < 60) {
      // Reds/oranges - shift toward orange/yellow
      newH = newH * 1.2;
    } else if (newH >= 60 && newH < 180) {
      // Greens - shift toward cyan/blue
      newH = 60 + (newH - 60) * 0.6 + 60;
    }
    // Boost saturation for problem colors
    if ((newH >= 0 && newH < 60) || (newH >= 80 && newH < 160)) {
      newS = Math.min(1, s * 1.5);
    }
  } else if (type === 'tritanopia') {
    // Shift blues to be more distinct from greens
    if (newH >= 180 && newH < 270) {
      newH = 180 + (newH - 180) * 1.3;
    }
    if (newH >= 180 && newH < 300) {
      newS = Math.min(1, s * 1.4);
    }
  }
  
  newH = newH % 360;
  
  // Convert back to RGB
  return hslToRgb(newH / 360, newS, l);
}

/**
 * High contrast mode - maximizes difference between colors
 */
function highContrast(r, g, b) {
  // Boost saturation dramatically
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
      case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
      case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
    }
  }
  
  // Maximize saturation, adjust lightness toward extremes
  const newS = Math.min(1, s * 2);
  const newL = l < 0.5 ? l * 0.7 : 0.3 + l * 0.7;
  
  return hslToRgb(h, newS, newL);
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h, s, l) {
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  ];
}

/**
 * Apply colorblind filter to an entire image (canvas ImageData)
 */
export function applyColorblindFilter(imageData, filterType) {
  const data = imageData.data;
  const newData = new Uint8ClampedArray(data);
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Alpha stays the same
    
    let newRgb;
    
    switch (filterType) {
      case 'protanopia-assist':
        newRgb = daltonize(r, g, b, 'protanopia');
        break;
      case 'deuteranopia-assist':
        newRgb = daltonize(r, g, b, 'deuteranopia');
        break;
      case 'tritanopia-assist':
        newRgb = daltonize(r, g, b, 'tritanopia');
        break;
      case 'protanopia-enhance':
        newRgb = enhanceColors(r, g, b, 'protanopia');
        break;
      case 'deuteranopia-enhance':
        newRgb = enhanceColors(r, g, b, 'deuteranopia');
        break;
      case 'tritanopia-enhance':
        newRgb = enhanceColors(r, g, b, 'tritanopia');
        break;
      case 'high-contrast':
        newRgb = highContrast(r, g, b);
        break;
      case 'protanopia-sim':
        newRgb = applyMatrix(r, g, b, COLORBLIND_MATRICES.protanopia);
        break;
      case 'deuteranopia-sim':
        newRgb = applyMatrix(r, g, b, COLORBLIND_MATRICES.deuteranopia);
        break;
      case 'tritanopia-sim':
        newRgb = applyMatrix(r, g, b, COLORBLIND_MATRICES.tritanopia);
        break;
      default:
        newRgb = [r, g, b];
    }
    
    newData[i] = newRgb[0];
    newData[i + 1] = newRgb[1];
    newData[i + 2] = newRgb[2];
  }
  
  return new ImageData(newData, imageData.width, imageData.height);
}

/**
 * Filter descriptions for UI
 */
export const FILTER_OPTIONS = [
  { id: 'none', name: 'Original', description: 'No filter applied', category: 'default' },
  
  // Assistance filters (help see colors)
  { id: 'protanopia-assist', name: 'Red-Blind Assist', description: 'Helps distinguish reds from greens', category: 'assist', icon: '🔴' },
  { id: 'deuteranopia-assist', name: 'Green-Blind Assist', description: 'Helps distinguish greens from reds', category: 'assist', icon: '🟢' },
  { id: 'tritanopia-assist', name: 'Blue-Blind Assist', description: 'Helps distinguish blues from greens', category: 'assist', icon: '🔵' },
  
  // Enhancement filters
  { id: 'protanopia-enhance', name: 'Red-Blind Enhanced', description: 'Enhanced colors for protanopia', category: 'enhance', icon: '✨' },
  { id: 'deuteranopia-enhance', name: 'Green-Blind Enhanced', description: 'Enhanced colors for deuteranopia', category: 'enhance', icon: '✨' },
  { id: 'tritanopia-enhance', name: 'Blue-Blind Enhanced', description: 'Enhanced colors for tritanopia', category: 'enhance', icon: '✨' },
  
  // High contrast
  { id: 'high-contrast', name: 'High Contrast', description: 'Maximum color distinction', category: 'enhance', icon: '⚡' },
  
  // Simulation (show how colorblind people see)
  { id: 'protanopia-sim', name: 'Simulate Red-Blind', description: 'See how red-blind people see', category: 'simulate', icon: '👁️' },
  { id: 'deuteranopia-sim', name: 'Simulate Green-Blind', description: 'See how green-blind people see', category: 'simulate', icon: '👁️' },
  { id: 'tritanopia-sim', name: 'Simulate Blue-Blind', description: 'See how blue-blind people see', category: 'simulate', icon: '👁️' },
];
