/**
 * Cloudflare Pages Function: /api/log
 * Real-time visitor and lecture activity logger sending formatted alerts to Telegram.
 */

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

// Handle CORS preflight requests
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

// Optional GET endpoint for status check
export async function onRequestGet({ env }) {
  const botToken = env?.TELEGRAM_BOT_TOKEN || "9228345264:AAHEk7y5pZ4J8_ksHVP7-X7QpJRakcyk7fA";
  const chatId = env?.TELEGRAM_CHAT_ID || "-1003992869146";

  return new Response(
    JSON.stringify({
      status: "online",
      service: "Cloudflare Pages Telegram Logger",
      configured: Boolean(botToken && chatId),
    }),
    { status: 200, headers: CORS_HEADERS },
  );
}

// Main POST handler: receives client analytics and forwards to Telegram
export async function onRequestPost({ request, env }) {
  try {
    const botToken = env?.TELEGRAM_BOT_TOKEN || "9228345264:AAHEk7y5pZ4J8_ksHVP7-X7QpJRakcyk7fA";
    const chatId = env?.TELEGRAM_CHAT_ID || "-1003992869146";

    if (!botToken || !chatId) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID",
        }),
        { status: 500, headers: CORS_HEADERS },
      );
    }

    // 1. Extract JSON body sent by Frontend
    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty or raw text
    }

    const {
      eventType = "page_visit",
      subject,
      chapter,
      lectureTitle,
      watchTime,
      screenResolution,
      pageUrl,
      extra,
    } = body;

    // 2. Extract Network, Geolocation, and Client info from Cloudflare request
    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "Unknown IP";

    const cf = request.cf || {};
    const city = cf.city || "Unknown City";
    const region = cf.region || cf.regionCode || "";
    const country = cf.country || "Unknown Country";
    const postalCode = cf.postalCode ? ` (${cf.postalCode})` : "";
    const locationStr = [city, region, country].filter(Boolean).join(", ") + postalCode;

    const isp = cf.asOrganization || "Unknown ISP";
    const asn = cf.asn ? `AS${cf.asn}` : "";
    const ispStr = asn ? `${isp} [${asn}]` : isp;

    const userAgent = request.headers.get("user-agent") || "Unknown UA";
    const platform = request.headers.get("sec-ch-ua-platform")?.replace(/"/g, "") || "";
    const model = request.headers.get("sec-ch-ua-model")?.replace(/"/g, "") || "";
    const isMobileHint = request.headers.get("sec-ch-ua-mobile") === "?1";

    const referer = request.headers.get("referer") || "Direct / None";

    // Compute friendly device name
    let deviceName = [platform, model].filter(Boolean).join(" ");
    if (!deviceName) {
      if (/android/i.test(userAgent)) deviceName = "Android Device";
      else if (/iphone|ipad|ipod/i.test(userAgent)) deviceName = "iOS Device";
      else if (/windows/i.test(userAgent)) deviceName = "Windows PC";
      else if (/macintosh|mac os x/i.test(userAgent)) deviceName = "Mac";
      else if (/linux/i.test(userAgent)) deviceName = "Linux PC";
      else deviceName = isMobileHint ? "Mobile Device" : "Desktop Browser";
    }

    // Icon & Header styling by Event Type
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
      eventLabel = "PDF Downloaded / Opened";
    } else if (eventType === "test_view") {
      eventIcon = "📝";
      eventLabel = "Test Paper Opened";
    }

    // Timestamp formatted in Indian Standard Time (IST)
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

    // 3. Format into a clean, modern Telegram HTML message
    let message = `${eventIcon} <b>${escapeHtml(eventLabel.toUpperCase())}</b>\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Lecture or Content Activity Section
    if (lectureTitle || subject || chapter || watchTime) {
      message += `📚 <b>Content Activity:</b>\n`;
      if (subject) message += `• <b>Subject:</b> ${escapeHtml(subject)}\n`;
      if (chapter) message += `• <b>Chapter:</b> ${escapeHtml(chapter)}\n`;
      if (lectureTitle) message += `• <b>Lecture:</b> <code>${escapeHtml(lectureTitle)}</code>\n`;
      if (watchTime) message += `• <b>Watch Time:</b> ⏱️ <code>${escapeHtml(watchTime)}</code>\n`;
      message += `\n`;
    }

    // Visitor Location & Network Details
    message += `🌍 <b>Visitor Info:</b>\n`;
    message += `• <b>IP:</b> <code>${escapeHtml(ip)}</code>\n`;
    message += `• <b>Location:</b> ${escapeHtml(locationStr)}\n`;
    message += `• <b>ISP:</b> ${escapeHtml(ispStr)}\n\n`;

    // Device Details
    message += `📱 <b>Device & Screen:</b>\n`;
    message += `• <b>Device:</b> ${escapeHtml(deviceName)}\n`;
    if (screenResolution)
      message += `• <b>Resolution:</b> <code>${escapeHtml(screenResolution)}</code>\n`;
    message += `• <b>User-Agent:</b> <code>${escapeHtml(truncate(userAgent, 110))}</code>\n\n`;

    // Page Navigation & Timestamp
    message += `🔗 <b>Navigation:</b>\n`;
    if (pageUrl) message += `• <b>URL:</b> ${escapeHtml(pageUrl)}\n`;
    message += `• <b>Referrer:</b> ${escapeHtml(truncate(referer, 80))}\n`;
    message += `• <b>Time:</b> <code>${escapeHtml(timeIst)} IST</code>`;

    if (extra && typeof extra === "object") {
      message += `\n\n⚙️ <b>Extra Metadata:</b>\n<code>${escapeHtml(JSON.stringify(extra, null, 2))}</code>`;
    }

    // 4. Send request to Telegram Bot API
    // 4. Send request to Telegram Bot API (with auto-migration support)
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

    let tgResult = await tgResponse.json();

    // Auto-retry if group was migrated to supergroup
    if (!tgResponse.ok && tgResult?.parameters?.migrate_to_chat_id) {
      targetChatId = tgResult.parameters.migrate_to_chat_id;
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
      tgResult = await tgResponse.json();
    }

    if (!tgResponse.ok) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Telegram API Error",
          details: tgResult,
        }),
        { status: 502, headers: CORS_HEADERS },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: tgResult.result?.message_id,
      }),
      { status: 200, headers: CORS_HEADERS },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || "Internal Logger Error",
      }),
      { status: 500, headers: CORS_HEADERS },
    );
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncate(str, maxLength) {
  if (!str) return "";
  return str.length > maxLength ? str.slice(0, maxLength) + "…" : str;
}
