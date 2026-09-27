/**
 * Safe fetch helper that validates response status and Content-Type,
 * preventing HTML parse errors (Unexpected token '<') on static hosting (e.g. Cloudflare Pages).
 */
export async function safeFetchJson<T>(url: string, options?: RequestInit, fallbackData?: T): Promise<T> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    if (!res.ok) {
      console.warn(`[SafeFetch] Request to ${url} failed with status ${res.status}`);
      return fallbackData as T;
    }

    if (!contentType.includes('application/json')) {
      console.warn(`[SafeFetch] Request to ${url} returned non-JSON content-type: ${contentType}. Falling back.`);
      return fallbackData as T;
    }

    const data = await res.json();
    return data;
  } catch (err) {
    console.warn(`[SafeFetch] Network or parse error for ${url}:`, err);
    return fallbackData as T;
  }
}
