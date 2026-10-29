/**
 * Shared Telegram Logger logic for both Server runtime & Cloudflare Pages Functions
 */

export const TELEGRAM_BOT_TOKEN = "9228345264:AAHEk7y5pZ4J8_ksHVP7-X7QpJRakcyk7fA";
export const TELEGRAM_CHAT_ID = "-1003992869146";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export async function processTelegramLog(request: Request, customEnv?: Record<string, string>) {
  try {
    const botToken = customEnv?.TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN;
    const chatId = customEnv?.TELEGRAM_CHAT_ID || TELEGRAM_CHAT_ID;

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      // Body may be empty
    }

    const eventType = String(body["eventType"] || "page_visit");
    const subject = body["subject"] ? String(body["subject"]) : undefined;
    const chapter = body["chapter"] ? String(body["chapter"]) : undefined;
    const lectureTitle = body["lectureTitle"] ? String(body["lectureTitle"]) : undefined;
    const watchTime = body["watchTime"] ? String(body["watchTime"]) : undefined;
    const screenResolution = body["screenResolution"]
      ? String(body["screenResolution"])
      : undefined;
    const pageUrl = body["pageUrl"] ? String(body["pageUrl"]) : undefined;
    const extra = body["extra"];

    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "Preview Client";

    const userAgent = request.headers.get("user-agent") || "Unknown Device";
    const referer = request.headers.get("referer") || "Direct";

    let eventIcon = "👀";
    let eventLabel = "Page Visit";

    if (eventType === "lecture_play") {
      eventIcon = "▶️";
      eventLabel = "Lecture Started";
    } else if (eventType === "lecture_progress" || eventType === "lecture_pause") {
      eventIcon = "⏱️";
      eventLabel = "Lecture Watched";
    } else if (eventType === "pdf_download") {
      eventIcon = "📥";
      eventLabel = "PDF Opened / Downloaded";
    }

    const now = new Date();
    const timeIst = now.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    let message = `${eventIcon} <b>${escapeHtml(eventLabel.toUpperCase())}</b>\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (lectureTitle || subject || chapter || watchTime) {
      message += `📚 <b>Content Activity:</b>\n`;
      if (subject) message += `• <b>Subject:</b> ${escapeHtml(subject)}\n`;
      if (chapter) message += `• <b>Chapter:</b> ${escapeHtml(chapter)}\n`;
      if (lectureTitle) message += `• <b>Lecture:</b> <code>${escapeHtml(lectureTitle)}</code>\n`;
      if (watchTime) message += `• <b>Watch Time:</b> ⏱️ <code>${escapeHtml(watchTime)}</code>\n`;
      message += `\n`;
    }

    message += `🌍 <b>Visitor Info:</b>\n`;
    message += `• <b>IP:</b> <code>${escapeHtml(ip)}</code>\n`;
    if (screenResolution)
      message += `• <b>Screen:</b> <code>${escapeHtml(screenResolution)}</code>\n`;
    message += `• <b>Device:</b> <code>${escapeHtml(truncate(userAgent, 90))}</code>\n\n`;

    message += `🔗 <b>Navigation:</b>\n`;
    if (pageUrl) message += `• <b>URL:</b> ${escapeHtml(pageUrl)}\n`;
    message += `• <b>Referrer:</b> ${escapeHtml(truncate(referer, 70))}\n`;
    message += `• <b>Time:</b> <code>${escapeHtml(timeIst)} IST</code>`;

    if (extra) {
      message += `\n\n⚙️ <b>Details:</b>\n<code>${escapeHtml(JSON.stringify(extra))}</code>`;
    }

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    let targetChatId = chatId;
    let tgResponse = await fetch(telegramApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: targetChatId,
        text: message,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
    });

    let tgResult = (await tgResponse.json()) as {
      ok?: boolean;
      parameters?: { migrate_to_chat_id?: string };
    };

    if (!tgResponse.ok && tgResult?.parameters?.migrate_to_chat_id) {
      targetChatId = String(tgResult.parameters.migrate_to_chat_id);
      tgResponse = await fetch(telegramApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: targetChatId,
          text: message,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      });
      tgResult = (await tgResponse.json()) as { ok?: boolean };
    }

    return new Response(JSON.stringify({ success: true, tgResponse: tgResult }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: (err as Error).message }), {
      status: 500,
      headers: CORS_HEADERS,
    });
  }
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncate(str: string, maxLength: number): string {
  return str.length > maxLength ? str.slice(0, maxLength) + "…" : str;
}
