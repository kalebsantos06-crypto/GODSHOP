import html2canvas, { Options } from 'html2canvas-pro';

/**
 * Safely sanitizes CSS string by replacing unsupported modern color functions
 * (oklab, oklch, color-mix in oklab) with transparent or inherit.
 */
export function sanitizeCssString(css: string): string {
  if (!css) return css;

  const lower = css.toLowerCase();
  if (!lower.includes('oklab') && !lower.includes('oklch') && !lower.includes('color-mix')) {
    return css;
  }

  let result = '';
  let i = 0;
  const len = css.length;

  while (i < len) {
    const remaining = css.substring(i);
    const matchFunc = remaining.match(/^(oklab|oklch|color-mix)\(/i);

    if (matchFunc) {
      const funcName = matchFunc[0];
      let depth = 1;
      let j = i + funcName.length;

      while (j < len && depth > 0) {
        if (css[j] === '(') depth++;
        else if (css[j] === ')') depth--;
        j++;
      }

      // Replace unsupported color function calls with transparent so they don't render as black
      result += 'transparent';
      i = j;
    } else {
      result += css[i];
      i++;
    }
  }

  // Also remove "in oklch" and "in oklab" from gradient functions, or other oklch/oklab words that crash html2canvas's parser
  result = result.replace(/in\s+(oklch|oklab)\s*,\s*/gi, '');
  result = result.replace(/,\s*in\s+(oklch|oklab)/gi, '');
  result = result.replace(/oklch|oklab/gi, 'transparent');

  return result;
}

/**
 * Bakes computed styles from live DOM elements into inline RGB/RGBA styles on cloned elements.
 * This guarantees html2canvas gets explicit, standard RGB colors and removes CSS blur filters
 * that cause pitch-black circle artifacts in canvas exports.
 */
export function bakeComputedStyles(originalEl: HTMLElement, clonedEl: HTMLElement) {
  try {
    const origElements = [originalEl, ...Array.from(originalEl.querySelectorAll<HTMLElement>('*'))];
    const clonedElements = [clonedEl, ...Array.from(clonedEl.querySelectorAll<HTMLElement>('*'))];

    for (let i = 0; i < origElements.length; i++) {
      const orig = origElements[i];
      const clone = clonedElements[i];
      if (!orig || !clone) continue;

      try {
        const comp = window.getComputedStyle(orig);

        // Copy computed colors as standard RGB/RGBA strings
        if (comp.color && comp.color !== 'rgba(0, 0, 0, 0)') {
          clone.style.color = comp.color;
        }
        if (comp.backgroundColor && comp.backgroundColor !== 'rgba(0, 0, 0, 0)') {
          clone.style.backgroundColor = comp.backgroundColor;
        }
        if (comp.borderColor && comp.borderColor !== 'rgba(0, 0, 0, 0)') {
          clone.style.borderColor = comp.borderColor;
        }

        // Remove CSS blur filters which html2canvas renders as solid black circles
        if (comp.filter && comp.filter !== 'none') {
          clone.style.filter = 'none';
        }
        if (comp.backdropFilter && comp.backdropFilter !== 'none') {
          clone.style.backdropFilter = 'none';
        }
      } catch (e) {
        // Ignore single element errors
      }
    }
  } catch (err) {
    console.warn('Error baking computed styles:', err);
  }
}

/**
 * Captures an HTML element into a canvas, baking computed styles and sanitizing
 * any modern CSS color functions for 100% accurate visual exports.
 */
export async function captureElementToCanvas(
  element: HTMLElement,
  options: Partial<Options> = {}
): Promise<HTMLCanvasElement> {
  // Pre-fetch and pre-sanitize all stylesheets in the live document
  const sanitizedStyles: string[] = [];
  const doc = element.ownerDocument || window.document;

  // 1. Pre-fetch external linked stylesheets
  const links = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
  for (const link of links) {
    const href = link.getAttribute('href');
    if (href) {
      try {
        const absoluteUrl = new URL(href, doc.baseURI).href;
        const res = await fetch(absoluteUrl);
        if (res.ok) {
          const rawCss = await res.text();
          sanitizedStyles.push(sanitizeCssString(rawCss));
        }
      } catch (err) {
        console.warn('Could not pre-fetch/sanitize linked stylesheet:', href, err);
      }
    }
  }

  // 2. Pre-read and sanitize active CSS rules (even those injected via CSSOM)
  try {
    const sheets = Array.from(doc.styleSheets);
    for (const sheet of sheets) {
      try {
        if (sheet.cssRules && sheet.cssRules.length > 0) {
          let rulesText = '';
          for (let r = 0; r < sheet.cssRules.length; r++) {
            rulesText += sheet.cssRules[r].cssText + '\n';
          }
          if (rulesText) {
            sanitizedStyles.push(sanitizeCssString(rulesText));
          }
        }
      } catch (err) {
        // SecurityError for cross-origin sheets, which is fine since we fetched them above if possible
      }
    }
  } catch (err) {
    console.warn('Could not read document styleSheets:', err);
  }

  // 3. Pre-read existing inline <style> tags text content
  const inlineStyles = Array.from(doc.querySelectorAll('style'));
  for (const style of inlineStyles) {
    if (style.textContent) {
      sanitizedStyles.push(sanitizeCssString(style.textContent));
    }
  }

  const mergedOptions: Partial<Options> = {
    scale: 3,
    useCORS: true,
    backgroundColor: null,
    logging: false,
    onclone: (clonedDoc: Document, clonedEl: HTMLElement) => {
      try {
        // 1. Bake exact computed RGB styles from live element into cloned DOM
        bakeComputedStyles(element, clonedEl);

        // 2. Remove ALL existing <link rel="stylesheet"> tags in the cloned document so html2canvas never fetches them
        const clonedLinks = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]'));
        clonedLinks.forEach(link => {
          link.parentNode?.removeChild(link);
        });

        // 3. Remove ALL existing <style> tags in the cloned document
        const clonedStyles = Array.from(clonedDoc.querySelectorAll('style'));
        clonedStyles.forEach(style => {
          style.parentNode?.removeChild(style);
        });

        // 4. Inject our pre-sanitized stylesheets
        sanitizedStyles.forEach(cssContent => {
          if (cssContent && cssContent.trim()) {
            const styleEl = clonedDoc.createElement('style');
            styleEl.textContent = cssContent;
            clonedDoc.head.appendChild(styleEl);
          }
        });

        // 5. Sanitize remaining inline style attributes on all cloned elements
        const allElements = Array.from(clonedDoc.querySelectorAll<HTMLElement>('*'));
        allElements.forEach((el) => {
          const attrStyle = el.getAttribute('style');
          if (attrStyle && (
            attrStyle.toLowerCase().includes('oklab') || 
            attrStyle.toLowerCase().includes('oklch') || 
            attrStyle.toLowerCase().includes('color-mix')
          )) {
            el.setAttribute('style', sanitizeCssString(attrStyle));
          }
        });

        // Run user custom onclone if provided
        if (options.onclone) {
          options.onclone(clonedDoc, clonedEl);
        }
      } catch (err) {
        console.warn('Error sanitizing cloned doc for html2canvas:', err);
      }
    },
    ...options
  };

  return html2canvas(element, mergedOptions);
}
