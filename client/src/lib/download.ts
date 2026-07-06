import { api } from '@/api/client';

/**
 * Fetch a binary endpoint (PDF/XLSX) with auth and trigger a browser download.
 * Uses the shared axios instance so the bearer token + refresh apply.
 */
export async function downloadFile(
  url: string,
  fallbackName: string,
  params?: Record<string, unknown>,
): Promise<void> {
  const res = await api.get(url, { params, responseType: 'blob' });

  const disposition = res.headers['content-disposition'] as string | undefined;
  let filename = fallbackName;
  if (disposition) {
    const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
    if (match?.[1]) filename = decodeURIComponent(match[1]);
  }

  const blobUrl = window.URL.createObjectURL(res.data as Blob);
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
}

/** Open a wa.me link (WhatsApp) in a new tab with pre-filled text. */
export function openWhatsApp(phone: string, text: string): void {
  const clean = phone.replace(/[^\d]/g, '');
  const url = `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
