/**
 * Cloudflare Pages Function: /api/log
 * Real-time visitor and lecture activity logger with Telegram Auto-Discovery.
 * Broadcasts logs to any group or channel the bot is added to.
 */

const DEFAULT_BOT_TOKEN = "9228345264:AAHEk7y5pZ4J8_ksHVP7-X7QpJRakcyk7fA";
const DEFAULT_CHAT_ID = "-1003992869146";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

// Global in-memory set of active discovered groups
const activeChatIds = new Set([DEFAULT_CHAT_ID]);
let lastSync = 0;

async function syncGroups(botToken) {
  const now = Date.now();
  if (now - lastSync < 15000) return Array.from(activeChatIds);
  lastSync = now;

  try {
    const url = `https://api.telegram.org/bot${botToken}/getUpdates?limit=100&allowed_updates=["my_chat_member","message","channel_post"]`;
    const res = await fetch(url);
    if (!res.ok) return Array.from(activeChatIds);

    const data = await res.json();
    if (data?.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        if (update.my_chat_member) {
          const chat = update.my_chat_member.chat;
          const status = update.my_chat_member.new_chat_member?.status;
          const id = String(chat.id);
          if (status === "left" || status === "kicked") {
            activeChatIds.delete(id);
          } else if (status === "member" || status === "administrator" || status === "creator") {
            activeChatIds.add(id);
          }
        }
        const chat = update.message?.chat || update.channel_post?.chat;
        if (chat && chat.type !== "private") {
          activeChatIds.add(String(chat.id));
        }
      }
    }
  } catch {
    // Keep cached
  }

  return Array.from(activeChatIds);
}

// Handle CORS preflight requests
export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

// GET endpoint: returns status and currently discovered groups
export async function onRequestGet({ env }) {
  const botToken = env?.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;
  await syncGroups(botToken);

  return new Response(
    JSON.stringify({
      status: "online",
      service: "Cloudflare Pages Telegram Logger with Auto-Discovery",
      activeGroupsCount: activeChatIds.size,
      activeGroups: Array.from(activeChatIds),
    }),
    { status: 200, headers: CORS_HEADERS },
  );
}

// Main POST handler: receives client analytics and broadcasts to all discovered groups
export async function onRequestPost({ request, env }) {
  try {
    const botToken = env?.TELEGRAM_BOT_TOKEN || DEFAULT_BOT_TOKEN;

    // Support comma-separated explicit IDs if configured in env
    if (env?.TELEGRAM_CHAT_ID) {
      env.TELEGRAM_CHAT_ID.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((id) => activeChatIds.add(id));
    }

    // Auto-sync latest discovered groups
    await syncGroups(botToken);

    let body = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty
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

    const referer = request.headers.get("referer") || "Direct";

    let deviceName = [platform, model].filter(Boolean).join(" ");
    if (!deviceName) {
      if (/android/i.test(userAgent)) deviceName = "Android Device";
      else if (/iphone|ipad|ipod/i.test(userAgent)) deviceName = "iOS Device";
      else if (/windows/i.test(userAgent)) deviceName = "Windows PC";
      else if (/macintosh|mac os x/i.test(userAgent)) deviceName = "Mac";
      else if (/linux/i.test(userAgent)) deviceName = "Linux PC";
      else deviceName = isMobileHint ? "Mobile Device" : "Desktop Browser";
    }

    let cleanReferrer = referer;
    try {
      if (referer && referer.startsWith("http")) {
        const u = new URL(referer);
        cleanReferrer = u.hostname + (u.pathname.length > 1 ? u.pathname : "");
      }
    } catch {
      // ignore
    }

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
    message += `• <b>Location:</b> ${escapeHtml(locationStr)}\n`;
    message += `• <b>ISP:</b> ${escapeHtml(ispStr)}\n\n`;

    message += `📱 <b>Device & Screen:</b>\n`;
    message += `• <b>Device:</b> ${escapeHtml(deviceName)}\n`;
    if (screenResolution)
      message += `• <b>Resolution:</b> <code>${escapeHtml(screenResolution)}</code>\n`;
    message += `• <b>User-Agent:</b> <code>${escapeHtml(truncate(userAgent, 110))}</code>\n\n`;

    message += `🔗 <b>Navigation:</b>\n`;
    if (pageUrl) message += `• <b>URL:</b> ${escapeHtml(pageUrl)}\n`;
    message += `• <b>Referrer:</b> ${escapeHtml(truncate(cleanReferrer, 60))}\n`;
    message += `• <b>Time:</b> <code>${escapeHtml(timeIst)} IST</code>`;

    if (extra && typeof extra === "object") {
      message += `\n\n⚙️ <b>Extra Metadata:</b>\n<code>${escapeHtml(JSON.stringify(extra, null, 2))}</code>`;
    }

    // Broadcast to all active chat IDs
    const targets = Array.from(activeChatIds);
    const results = [];

    await Promise.allSettled(
      targets.map(async (chatId) => {
        const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
        let targetId = chatId;
        try {
          let tgResponse = await fetch(telegramApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: targetId,
              text: message,
              parse_mode: "HTML",
              disable_web_page_preview: true,
            }),
          });

          let tgResult = await tgResponse.json();

          if (!tgResponse.ok && tgResult?.parameters?.migrate_to_chat_id) {
            targetId = String(tgResult.parameters.migrate_to_chat_id);
            activeChatIds.delete(chatId);
            activeChatIds.add(targetId);

            tgResponse = await fetch(telegramApiUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: targetId,
                text: message,
                parse_mode: "HTML",
                disable_web_page_preview: true,
              }),
            });
            tgResult = await tgResponse.json();
          }

          if (
            !tgResponse.ok &&
            (tgResponse.status === 403 ||
              tgResult?.description?.includes("kicked") ||
              tgResult?.description?.includes("not found"))
          ) {
            activeChatIds.delete(chatId);
            results.push({ chatId, success: false, error: tgResult?.description });
            return;
          }

          results.push({ chatId: targetId, success: tgResponse.ok });
        } catch (err) {
          results.push({ chatId: targetId, success: false, error: err.message });
        }
      }),
    );

    return new Response(
      JSON.stringify({
        success: true,
        broadcastCount: results.filter((r) => r.success).length,
        totalGroups: results.length,
        results,
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
