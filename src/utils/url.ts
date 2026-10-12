/**
 * Utility functions for URL formatting and Clipboard operations,
 * optimized for iOS Safari, WhatsApp WebViews, Cloudflare Pages, and Capacitor Android APK.
 */
export const getBaseUrl = (): string => {
  if (typeof window === 'undefined') return 'https://godshop.pages.dev';

  // Check if a custom public domain was set in localStorage or environment
  try {
    const custom = localStorage.getItem('custom_app_domain');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/$/, '');
    }
  } catch (e) {}

  let url = window.location.href.split('#')[0].split('?')[0].replace(/\/$/, '');

  // If running inside Capacitor Android APK, localhost, file://, or non-http protocol,
  // return the public production domain so links shared via WhatsApp can be opened by anyone!
  if (
    url.includes('localhost') ||
    url.includes('127.0.0.1') ||
    url.startsWith('capacitor:') ||
    url.startsWith('file:') ||
    !url.startsWith('http')
  ) {
    return 'https://godshop.pages.dev';
  }

  // Convert dev container URLs to public shareable URLs (ais-dev -> ais-pre)
  if (url.includes('ais-dev-')) {
    url = url.replace('ais-dev-', 'ais-pre-');
  }

  return url;
};

/**
 * Copies text to clipboard with robust fallback support for iOS Safari,
 * WhatsApp in-app browsers, Android WebViews, and async call stacks.
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  if (!text) return false;

  // Modern Clipboard API
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.warn('navigator.clipboard failed, attempting fallback:', err);
    }
  }

  // Fallback for iOS Safari, WhatsApp Webview, and unsecure/async contexts
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;

    // Position offscreen to prevent iOS scroll jumps
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
    textArea.setAttribute('readonly', ''); // Prevent keyboard popup on iOS

    document.body.appendChild(textArea);

    if (navigator.userAgent.match(/iphone|ipad|ipod/i)) {
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
    }

    const successful = document.execCommand('copy');
    try {
      if (textArea && textArea.parentNode) {
        textArea.parentNode.removeChild(textArea);
      }
    } catch (e) {}
    return successful;
  } catch (err) {
    console.error('Fallback copy failed:', err);
    return false;
  }
};
