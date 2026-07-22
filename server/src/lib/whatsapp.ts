import { env } from "./env";

// Build a wa.me click-to-chat link (the MVP WhatsApp gateway, BUILD_CONTRACT §3).
export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = String(phone ?? "").replace(/[^0-9]/g, "");
  const text = encodeURIComponent(message);
  if (env.whatsappGateway === "walink") {
    return `https://wa.me/${digits}?text=${text}`;
  }
  return `https://wa.me/${digits}?text=${text}`;
}

/**
 * Send a PDF document directly via the WhatsApp Business (Meta Cloud) API —
 * the real, fully-automatic gateway (as opposed to `walink`'s click-to-chat,
 * which can't attach files). Only used when WHATSAPP_GATEWAY=business-api.
 *
 * Requires a verified WhatsApp Business Platform account: WHATSAPP_BUSINESS_API_TOKEN
 * (a permanent access token) and WHATSAPP_BUSINESS_PHONE_NUMBER_ID (the sender
 * number's ID from the Meta developer console). Throws a clear config error
 * if either is missing, rather than silently no-op'ing or sending a broken
 * request — a caller enabling this mode without credentials needs to know
 * immediately, not have receipts silently fail to send.
 */
export async function sendWhatsAppDocumentViaBusinessApi(
  phone: string,
  pdfBuffer: Buffer,
  filename: string,
  caption: string
): Promise<void> {
  const token = env.whatsappBusinessApiToken;
  const phoneNumberId = env.whatsappBusinessPhoneNumberId;
  if (!token || !phoneNumberId) {
    throw new Error(
      "WhatsApp Business API is not configured — set WHATSAPP_BUSINESS_API_TOKEN and " +
        "WHATSAPP_BUSINESS_PHONE_NUMBER_ID (see server/.env.example)"
    );
  }
  const digits = String(phone ?? "").replace(/[^0-9]/g, "");
  const base = `https://graph.facebook.com/${env.whatsappBusinessApiVersion}/${phoneNumberId}`;

  // 1. Upload the PDF as media — the Cloud API sends documents by reference
  //    to a previously-uploaded media id, not as an inline attachment.
  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  // Buffer's underlying ArrayBufferLike can type as SharedArrayBuffer, which
  // Blob's constructor doesn't accept — copy into a plain Uint8Array first.
  form.append("file", new Blob([new Uint8Array(pdfBuffer)], { type: "application/pdf" }), filename);
  const uploadRes = await fetch(`${base}/media`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!uploadRes.ok) {
    throw new Error(`WhatsApp media upload failed (${uploadRes.status}): ${await uploadRes.text()}`);
  }
  const { id: mediaId } = (await uploadRes.json()) as { id: string };

  // 2. Send a document message referencing that media id.
  const sendRes = await fetch(`${base}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: digits,
      type: "document",
      document: { id: mediaId, filename, caption },
    }),
  });
  if (!sendRes.ok) {
    throw new Error(`WhatsApp send failed (${sendRes.status}): ${await sendRes.text()}`);
  }
}
