import { env } from "./env";

// Build a wa.me click-to-chat link (the MVP WhatsApp gateway, BUILD_CONTRACT §3).
// A real Business-API gateway can be dropped in later behind the same helper.
export function buildWhatsAppLink(phone: string, message: string): string {
  const digits = String(phone ?? "").replace(/[^0-9]/g, "");
  const text = encodeURIComponent(message);
  if (env.whatsappGateway === "walink") {
    return `https://wa.me/${digits}?text=${text}`;
  }
  return `https://wa.me/${digits}?text=${text}`;
}
