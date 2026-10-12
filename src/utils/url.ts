/**
 * Utility functions for URL formatting, Clipboard operations, and Sharing,
 * optimized for Android Capacitor APK, Cloudflare Pages, iOS Safari, and WebViews.
 */

export const getCustomAppDomain = (): string => {
  try {
    const custom = localStorage.getItem('custom_app_domain');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/$/, '');
    }
  } catch (e) {}
  return '';
};

export const setCustomAppDomain = (domain: string): void => {
  try {
    const clean = domain.trim().replace(/\/$/, '');
    if (clean) {
      localStorage.setItem('custom_app_domain', clean);
    } else {
      localStorage.removeItem('custom_app_domain');
    }
  } catch (e) {}
};

export const getBaseUrl = (): string => {
  if (typeof window === 'undefined') return 'https://godshop.pages.dev';

  // 1. Check if a custom public domain was configured in Settings
  const custom = getCustomAppDomain();
  if (custom) {
    return custom;
  }

  let url = window.location.href.split('#')[0].split('?')[0].replace(/\/$/, '');

  // 2. If running inside Capacitor Android APK (localhost, capacitor://, file://, etc.),
  // return the public production domain so links sent to customers open correctly anywhere!
  if (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.startsWith('capacitor:') ||
    url.startsWith('file:') ||
    !url.startsWith('http')
  ) {
    return 'https://godshop.pages.dev';
  }

  // 3. Convert dev container URLs to public shareable URLs (ais-dev -> ais-pre)
  if (url.includes('ais-dev-')) {
    url = url.replace('ais-dev-', 'ais-pre-');
  }

  return url;
};

// Helper for dynamic Capacitor Clipboard plugin bypassing Rollup static analysis
const getCapacitorClipboard = async () => {
  try {
    const importFn = new Function('specifier', 'return import(specifier);');
    const mod = await importFn('@capacitor/clipboard');
    return mod?.Clipboard || null;
  } catch {
    return null;
  }
};

// Helper for dynamic Capacitor Share plugin bypassing Rollup static analysis
const getCapacitorShare = async () => {
  try {
    const importFn = new Function('specifier', 'return import(specifier);');
    const mod = await importFn('@capacitor/share');
    return mod?.Share || null;
  } catch {
    return null;
  }
};

/**
 * Copies text to clipboard with Capacitor native plugin support,
 * modern Clipboard API, and DOM fallback for Android APK and browsers.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  // 1. Capacitor Native Clipboard (Android APK & iOS)
  try {
    const Clipboard = await getCapacitorClipboard();
    if (Clipboard) {
      await Clipboard.write({ string: text });
      return true;
    }
  } catch (capErr) {
    // Fall through to web clipboard
  }

  // 2. Modern Clipboard API (Secure browser contexts)
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard failed, attempting fallback:', err);
    }
  }

  // 3. DOM Textarea Fallback (WebViews and async contexts)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '0';
    textArea.style.width = '2em';
    textArea.style.height = '2em';
    textArea.style.padding = '0';
    textArea.style.border = 'none';
    textArea.style.outline = 'none';
    textArea.style.boxShadow = 'none';
    textArea.style.background = 'transparent';

    document.body.appendChild(textArea);
    textArea.focus();

    if (navigator.userAgent.match(/iphone|ipad|ipod/i)) {
      textArea.setAttribute('readonly', '');
      const range = document.createRange();
      range.selectNodeContents(textArea);
      const selection = window.getSelection();
      if (selection) {
        selection.removeAllRanges();
        selection.addRange(range);
      }
      textArea.setSelectionRange(0, 999999);
    } else {
      textArea.select();
      textArea.setSelectionRange(0, text.length);
    }

    const successful = document.execCommand('copy');
    try {
      if (textArea && textArea.parentNode) {
        textArea.parentNode.removeChild(textArea);
      }
    } catch (e) {}
    return Boolean(successful);
  } catch (err) {
    console.error('Fallback copy failed:', err);
    return false;
  }
};

/**
 * Reads text from clipboard using Capacitor native plugin or Web Clipboard API.
 */
export const readFromClipboard = async (): Promise<string> => {
  // 1. Capacitor Native Clipboard
  try {
    const Clipboard = await getCapacitorClipboard();
    if (Clipboard) {
      const result = await Clipboard.read();
      if (result && typeof result.value === 'string' && result.value) {
        return result.value;
      }
    }
  } catch (capErr) {
    // Fall through
  }

  // 2. Browser Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (text) return text;
    } catch (err) {
      console.warn('navigator.clipboard.readText error:', err);
    }
  }

  return '';
};

/**
 * Shares text/URL using Capacitor Native Share Sheet or Web Share API.
 */
export const shareContent = async (options: {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}): Promise<boolean> => {
  // 1. Capacitor Native Share
  try {
    const Share = await getCapacitorShare();
    if (Share) {
      await Share.share({
        title: options.title || 'GODSHOP',
        text: options.text || '',
        url: options.url,
        dialogTitle: options.dialogTitle || 'Compartilhar'
      });
      return true;
    }
  } catch (capErr: any) {
    if (capErr?.message?.includes('canceled') || capErr?.message?.includes('cancelled')) {
      return true;
    }
  }

  // 2. Web Share API fallback
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share({
        title: options.title,
        text: options.text,
        url: options.url
      });
      return true;
    } catch (sErr: any) {
      if (sErr?.name === 'AbortError') return true;
    }
  }

  // 3. Fallback: WhatsApp web link if text/url provided
  const combined = [options.text, options.url].filter(Boolean).join('\n\n');
  if (combined && typeof window !== 'undefined') {
    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(combined)}`;
    window.open(waUrl, '_blank');
    return true;
  }

  return false;
};
