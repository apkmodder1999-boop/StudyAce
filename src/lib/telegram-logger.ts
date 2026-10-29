/**
 * Telegram Auto-Discovery & Real-Time Logger
 * Automatically discovers any group or channel the bot is added to and broadcasts logs.
 */

import { recordEvent, type LogEvent } from "./admin-store";

export const TELEGRAM_BOT_TOKEN = "9228345264:AAHEk7y5pZ4J8_ksHVP7-X7QpJRakcyk7fA";
export const DEFAULT_CHAT_ID = "-1003992869146";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

// In-memory registry of active discovered groups
const activeChatIds = new Set<string>([DEFAULT_CHAT_ID]);
const chatMetaMap = new Map<string, { title: string; type: string; addedAt: string }>([
  [
    DEFAULT_CHAT_ID,
    { title: "Statistics (Default)", type: "supergroup", addedAt: new Date().toISOString() },
  ],
]);

let lastSyncTimestamp = 0;
const SYNC_INTERVAL_MS = 15000; // Auto-sync with Telegram every 15s

/**
 * Auto-Discovers all groups/channels the bot has been added to via Telegram getUpdates
 */
export async function syncDiscoveredChats(botToken: string = TELEGRAM_BOT_TOKEN) {
  const now = Date.now();
  if (now - lastSyncTimestamp < SYNC_INTERVAL_MS) {
    return Array.from(activeChatIds);
  }
  lastSyncTimestamp = now;

  try {
    const url = `https://api.telegram.org/bot${botToken}/getUpdates?limit=100&allowed_updates=["my_chat_member","message","channel_post"]`;
    const res = await fetch(url);
    if (!res.ok) return Array.from(activeChatIds);

    const data = (await res.json()) as {
      ok?: boolean;
      result?: Array<{
        update_id?: number;
        my_chat_member?: {
          chat: { id: number | string; title?: string; type?: string };
          new_chat_member?: { status?: string };
        };
        message?: {
          chat: { id: number | string; title?: string; type?: string };
          text?: string;
        };
        channel_post?: {
          chat: { id: number | string; title?: string; type?: string };
        };
      }>;
    };

    if (data?.ok && Array.isArray(data.result)) {
      for (const update of data.result) {
        // 1. Bot membership status change in group/channel
        if (update.my_chat_member) {
          const chat = update.my_chat_member.chat;
          const status = update.my_chat_member.new_chat_member?.status;
          const chatIdStr = String(chat.id);

          if (status === "left" || status === "kicked") {
            activeChatIds.delete(chatIdStr);
            chatMetaMap.delete(chatIdStr);
          } else if (status === "member" || status === "administrator" || status === "creator") {
            activeChatIds.add(chatIdStr);
            chatMetaMap.set(chatIdStr, {
              title: chat.title || `Chat ${chatIdStr}`,
              type: chat.type || "group",
              addedAt: new Date().toISOString(),
            });
          }
        }

        // 2. Any message or activity in groups/supergroups/channels
        const chat = update.message?.chat || update.channel_post?.chat;
        if (chat && chat.type !== "private") {
          const chatIdStr = String(chat.id);
          activeChatIds.add(chatIdStr);
          if (!chatMetaMap.has(chatIdStr)) {
            chatMetaMap.set(chatIdStr, {
              title: chat.title || `Group ${chatIdStr}`,
              type: chat.type || "group",
              addedAt: new Date().toISOString(),
            });
          }
        }
      }
    }
  } catch (err) {
    console.error("Failed to auto-sync Telegram groups:", err);
  }

  return Array.from(activeChatIds);
}

/**
 * Webhook handler when Telegram pushes real-time updates directly
 */
export async function handleTelegramWebhook(
  request: Request,
  botToken: string = TELEGRAM_BOT_TOKEN,
) {
  try {
    const update = (await request.json()) as {
      my_chat_member?: {
        chat: { id: number | string; title?: string; type?: string };
        new_chat_member?: { status?: string };
      };
      message?: {
        chat: { id: number | string; title?: string; type?: string };
        text?: string;
      };
    };

    let registeredChatId: string | null = null;
    let chatTitle = "";

    if (update?.my_chat_member) {
      const chat = update.my_chat_member.chat;
      const status = update.my_chat_member.new_chat_member?.status;
      const idStr = String(chat.id);

      if (status === "left" || status === "kicked") {
        activeChatIds.delete(idStr);
        chatMetaMap.delete(idStr);
      } else {
        activeChatIds.add(idStr);
        registeredChatId = idStr;
        chatTitle = chat.title || idStr;
        chatMetaMap.set(idStr, {
          title: chatTitle,
          type: chat.type || "group",
          addedAt: new Date().toISOString(),
        });
      }
    } else if (update?.message?.chat && update.message.chat.type !== "private") {
      const chat = update.message.chat;
      const idStr = String(chat.id);
      activeChatIds.add(idStr);
      registeredChatId = idStr;
      chatTitle = chat.title || idStr;
      chatMetaMap.set(idStr, {
        title: chatTitle,
        type: chat.type || "group",
        addedAt: new Date().toISOString(),
      });
    }

    // Send confirmation welcome message to newly registered group
    if (registeredChatId && botToken) {
      const confirmUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      await fetch(confirmUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: registeredChatId,
          text: `🎉 <b>Auto-Discovery Active!</b>\nThis group (<code>${chatTitle}</code>) has been successfully registered to receive real-time visitor and lecture activity logs.`,
          parse_mode: "HTML",
        }),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ ok: true, activeGroups: Array.from(activeChatIds) }), {
      status: 200,
      headers: CORS_HEADERS,
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }
}

/**
 * Returns list of all active registered groups for status display
 */
export function getRegisteredGroups() {
  return Array.from(activeChatIds).map((id) => ({
    id,
    ...(chatMetaMap.get(id) || { title: `Chat ${id}`, type: "group", addedAt: "Unknown" }),
  }));
}

/**
 * Broadcasts a formatted message to ALL discovered groups
 */
export async function broadcastTelegramMessage(botToken: string, message: string) {
  // Sync latest groups before broadcast
  await syncDiscoveredChats(botToken);

  const chatList = Array.from(activeChatIds);
  const results: Array<{ chatId: string; success: boolean; messageId?: number; error?: string }> =
    [];

  await Promise.allSettled(
    chatList.map(async (chatId) => {
      const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
      let targetId = chatId;

      try {
        let res = await fetch(telegramApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: targetId,
            text: message,
            parse_mode: "HTML",
            disable_web_page_preview: true,
          }),
        });

        let json = (await res.json()) as {
          ok?: boolean;
          result?: { message_id?: number };
          description?: string;
          parameters?: { migrate_to_chat_id?: string | number };
        };

        // If group upgraded to supergroup, retry with new ID
        if (!res.ok && json?.parameters?.migrate_to_chat_id) {
          const newId = String(json.parameters.migrate_to_chat_id);
          activeChatIds.delete(targetId);
          activeChatIds.add(newId);
          targetId = newId;

          res = await fetch(telegramApiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: targetId,
              text: message,
              parse_mode: "HTML",
              disable_web_page_preview: true,
            }),
          });
          json = (await res.json()) as { ok?: boolean; result?: { message_id?: number } };
        }

        // If bot was removed / forbidden, prune from list
        if (
          !res.ok &&
          (res.status === 403 ||
            json?.description?.includes("kicked") ||
            json?.description?.includes("not found"))
        ) {
          activeChatIds.delete(chatId);
          chatMetaMap.delete(chatId);
          results.push({ chatId, success: false, error: json?.description || "Bot removed" });
          return;
        }

        if (res.ok && json.ok) {
          results.push({ chatId: targetId, success: true, messageId: json.result?.message_id });
        } else {
          results.push({
            chatId: targetId,
            success: false,
            error: json?.description || "Send failed",
          });
        }
      } catch (err) {
        results.push({ chatId: targetId, success: false, error: (err as Error).message });
      }
    }),
  );

  return results;
}

/**
 * Handles incoming client log requests and broadcasts to all discovered groups
 */
export async function processTelegramLog(request: Request, customEnv?: Record<string, string>) {
  try {
    const botToken = customEnv?.TELEGRAM_BOT_TOKEN || TELEGRAM_BOT_TOKEN;

    // Check if additional chat IDs were configured via environment variable
    if (customEnv?.TELEGRAM_CHAT_ID) {
      customEnv.TELEGRAM_CHAT_ID.split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .forEach((id) => activeChatIds.add(id));
    }

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
    const studentName = body["studentName"] ? String(body["studentName"]) : undefined;
    const sessionId = body["sessionId"] ? String(body["sessionId"]) : undefined;
    const watchSeconds =
      typeof body["watchSeconds"] === "number" ? (body["watchSeconds"] as number) : undefined;

    const ip =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("x-forwarded-for") ||
      "Preview Client";

    const userAgent = request.headers.get("user-agent") || "Unknown Device";
    const referer = request.headers.get("referer") || "Direct";

    // Format cleaner friendly referrer
    let cleanReferrer = referer;
    try {
      if (referer && referer.startsWith("http")) {
        const u = new URL(referer);
        cleanReferrer = u.hostname + (u.pathname.length > 1 ? u.pathname : "");
      }
    } catch {
      // keep raw
    }

    // Record into Admin Analytics Store
    recordEvent({
      sessionId,
      studentName,
      eventType: (eventType || "page_visit") as LogEvent["eventType"],
      subject,
      chapter,
      lectureTitle,
      watchTime,
      watchSeconds,
      screenResolution,
      pageUrl,
      ip,
      userAgent,
    });

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
    message += `• <b>Referrer:</b> ${escapeHtml(truncate(cleanReferrer, 60))}\n`;
    message += `• <b>Time:</b> <code>${escapeHtml(timeIst)} IST</code>`;

    if (extra) {
      message += `\n\n⚙️ <b>Details:</b>\n<code>${escapeHtml(JSON.stringify(extra))}</code>`;
    }

    // Broadcast to all discovered groups
    const broadcastResults = await broadcastTelegramMessage(botToken, message);

    return new Response(
      JSON.stringify({
        success: true,
        broadcastCount: broadcastResults.filter((r) => r.success).length,
        totalGroups: broadcastResults.length,
        results: broadcastResults,
      }),
      { status: 200, headers: CORS_HEADERS },
    );
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
