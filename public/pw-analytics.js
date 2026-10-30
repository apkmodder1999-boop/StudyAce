/**
 * Lightweight Client-Side Analytics Tracker for Cloudflare Pages & Telegram Logger
 * Zero dependencies. Uses navigator.sendBeacon & fetch(keepalive) for reliable unload tracking.
 */
(function () {
  "use strict";

  var LOG_ENDPOINT = "/api/log";
  var HEARTBEAT_ENDPOINT = "/api/heartbeat";

  // Persistent Client Session ID
  function getSessionId() {
    try {
      var id = localStorage.getItem("pw_session_id");
      if (!id) {
        id = "std_" + Date.now().toString(36) + "_" + Math.random().toString(36).substring(2, 8);
        localStorage.setItem("pw_session_id", id);
      }
      return id;
    } catch (e) {
      return "std_guest";
    }
  }

  // Get or prompt student name
  function getStudentName() {
    try {
      return localStorage.getItem("pw_student_name") || "";
    } catch (e) {
      return "";
    }
  }

  // Reusable helper to send data via Beacon or fetch keepalive
  function sendLog(payload) {
    try {
      var data = Object.assign(
        {
          sessionId: getSessionId(),
          studentName: getStudentName(),
          screenResolution: window.screen
            ? window.screen.width + "x" + window.screen.height
            : "Unknown",
          pageUrl: window.location.href,
          timestamp: new Date().toISOString(),
        },
        payload,
      );

      var jsonStr = JSON.stringify(data);

      if (navigator.sendBeacon) {
        var blob = new Blob([jsonStr], { type: "application/json" });
        var sent = navigator.sendBeacon(LOG_ENDPOINT, blob);
        if (sent) return;
      }

      fetch(LOG_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: jsonStr,
        keepalive: true,
      }).catch(function () {});
    } catch (e) {}
  }

  function formatSeconds(secs) {
    var s = Math.floor(secs || 0);
    var h = Math.floor(s / 3600);
    var m = Math.floor((s % 3600) / 60);
    var sec = s % 60;
    if (h > 0) return h + "h " + m + "m " + sec + "s";
    if (m > 0) return m + "m " + sec + "s";
    return sec + "s";
  }

  // 1. Automatically Log Page Visit on Load
  window.addEventListener("DOMContentLoaded", function () {
    sendLog({
      eventType: "page_visit",
      pageTitle: document.title,
    });
  });

  // Track Video Playback States
  var activeVideo = null;
  var watchStartTime = 0;
  var accumulatedWatchSeconds = 0;
  var isPlaying = false;

  function onVideoPlay(e) {
    activeVideo = e.target;
    isPlaying = true;
    watchStartTime = Date.now();

    var title =
      activeVideo.getAttribute("data-title") ||
      document.querySelector("h1, h2, .lecture-title")?.innerText ||
      "Video Lecture";

    var subject = activeVideo.getAttribute("data-subject") || "";
    var chapter = activeVideo.getAttribute("data-chapter") || "";

    sendLog({
      eventType: "lecture_play",
      lectureTitle: title,
      subject: subject,
      chapter: chapter,
      watchTime: formatSeconds(activeVideo.currentTime),
    });
  }

  function onVideoPause(e) {
    if (!isPlaying) return;
    isPlaying = false;
    var sessionSeconds = (Date.now() - watchStartTime) / 1000;
    accumulatedWatchSeconds += sessionSeconds;

    var video = e.target || activeVideo;
    var title =
      video?.getAttribute("data-title") ||
      document.querySelector("h1, h2, .lecture-title")?.innerText ||
      "Video Lecture";

    if (accumulatedWatchSeconds >= 3) {
      sendLog({
        eventType: "lecture_pause",
        lectureTitle: title,
        watchSeconds: Math.floor(accumulatedWatchSeconds),
        watchTime:
          formatSeconds(accumulatedWatchSeconds) +
          " (Pos: " +
          formatSeconds(video?.currentTime || 0) +
          ")",
      });
    }
  }

  function attachVideoListeners() {
    var videos = document.querySelectorAll("video");
    videos.forEach(function (v) {
      if (v._pwLoggerAttached) return;
      v._pwLoggerAttached = true;
      v.addEventListener("play", onVideoPlay);
      v.addEventListener("pause", onVideoPause);
      v.addEventListener("ended", onVideoPause);
    });
  }

  // Handle Tab Close / Unload
  function onPageUnload() {
    if (isPlaying && activeVideo) {
      var sessionSeconds = (Date.now() - watchStartTime) / 1000;
      accumulatedWatchSeconds += sessionSeconds;
      isPlaying = false;

      var title =
        activeVideo.getAttribute("data-title") ||
        document.querySelector("h1, h2, .lecture-title")?.innerText ||
        "Video Lecture";

      sendLog({
        eventType: "lecture_progress",
        lectureTitle: title,
        watchSeconds: Math.floor(accumulatedWatchSeconds),
        watchTime: formatSeconds(accumulatedWatchSeconds) + " watched",
      });
    }
  }

  window.addEventListener("pagehide", onPageUnload);
  window.addEventListener("beforeunload", onPageUnload);

  // Auto-listen to PDF clicks
  document.addEventListener("click", function (e) {
    var target = e.target.closest("a, button");
    if (!target) return;

    var href = target.getAttribute("href") || "";
    var text = (target.innerText || "").trim();

    var isPdf =
      href.toLowerCase().includes(".pdf") ||
      text.toLowerCase().includes(".pdf") ||
      text.toLowerCase().includes("open pdf") ||
      text.toLowerCase().includes("download");

    if (isPdf) {
      sendLog({
        eventType: "pdf_download",
        lectureTitle: text || href.split("/").pop() || "Study Material PDF",
        extra: { downloadUrl: href || undefined },
      });
    }
  });

  // Watch for dynamically loaded videos
  if (window.MutationObserver) {
    var observer = new MutationObserver(function () {
      attachVideoListeners();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachVideoListeners);
  } else {
    attachVideoListeners();
  }

  // Periodic heartbeat every 25 seconds for online user presence
  setInterval(function () {
    try {
      var addedSeconds = 0;
      if (isPlaying && watchStartTime) {
        addedSeconds = Math.floor((Date.now() - watchStartTime) / 1000);
        watchStartTime = Date.now();
      }

      fetch(HEARTBEAT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: getSessionId(),
          studentName: getStudentName(),
          watchSeconds: addedSeconds,
          pageUrl: window.location.href,
        }),
      }).catch(function () {});
    } catch (e) {}
  }, 25000);

  // Global manual helper API
  window.PWLogger = {
    log: sendLog,
    getSessionId: getSessionId,
    getStudentName: getStudentName,
    setStudentName: function (name) {
      try {
        localStorage.setItem("pw_student_name", name.trim());
        sendLog({
          eventType: "page_visit",
          studentName: name.trim(),
          extra: { action: "student_identified", name: name.trim() },
        });
      } catch (e) {}
    },
    logLecture: function (action, details) {
      sendLog(
        Object.assign(
          {
            eventType: action === "play" ? "lecture_play" : "lecture_progress",
          },
          details,
        ),
      );
    },
    logPdf: function (title, url) {
      sendLog({
        eventType: "pdf_download",
        lectureTitle: title,
        extra: { downloadUrl: url },
      });
    },
  };
})();
