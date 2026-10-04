import { useState, useMemo } from "react";
import { Code2, X, Copy, Check, ExternalLink, Terminal, Search, Layers } from "lucide-react";
import { API_BASE, type ContentType } from "@/lib/api";

interface ApiInspectorModalProps {
  batchId: string;
  subjectId: string;
  topicId: string;
  topicName?: string | undefined;
  currentTab: ContentType;
  items: unknown[];
  isLoading?: boolean | undefined;
}

export function ApiInspectorButton({
  onClick,
  itemCount,
}: {
  onClick: () => void;
  itemCount?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Inspect live API endpoints"
      className="inline-flex items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/20 hover:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/40 shadow-sm"
      title="View live API endpoint & fetched data"
    >
      <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary text-primary-foreground font-mono text-[10px] font-black">
        &lt;/&gt;
      </span>
      <span className="font-mono font-bold tracking-tight">API</span>
      {typeof itemCount === "number" && (
        <span className="rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-mono font-bold text-primary">
          {itemCount}
        </span>
      )}
    </button>
  );
}

export function ApiInspectorModal({
  isOpen,
  onClose,
  batchId,
  subjectId,
  topicId,
  topicName,
  currentTab,
  items,
  isLoading = false,
}: ApiInspectorModalProps & { isOpen: boolean; onClose: () => void }) {
  const [selectedContentType, setSelectedContentType] = useState<ContentType>(currentTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"json" | "endpoints" | "curl">("json");

  const mappedType =
    selectedContentType === "Videos"
      ? "videos"
      : selectedContentType === "notes"
        ? "Notes"
        : selectedContentType === "DppNotes"
          ? "dppNotes"
          : "Test";

  const v1Endpoint = `${API_BASE}/v1/${batchId}/subject/${subjectId}/contents?page=1&tag=${topicId}&contentType=${mappedType}`;
  const primaryEndpoint = v1Endpoint;
  const proxyEndpoint = `/api/public/pw/v1/${batchId}/subject/${subjectId}/contents?page=1&tag=${topicId}&contentType=${mappedType}`;
  const topicsEndpoint = `${API_BASE}/v1/${batchId}/subject/${subjectId}/topics?page=1`;
  const detailsEndpoint = `${API_BASE}/v1/${batchId}/details`;
  const subjectsEndpoint = `${API_BASE}/v1/${batchId}/get-batch-subjects`;

  const allEndpoints = useMemo(
    () => [
      {
        label: `Heroku Proxy v1 Contents (${mappedType} for topic)`,
        method: "GET",
        url: v1Endpoint,
        description:
          "Primary v1 endpoint used for fetching lectures, notes, DPPs, and tests tagged to this chapter.",
      },
      {
        label: "Subject Topics List",
        method: "GET",
        url: topicsEndpoint,
        description: "Subject chapters and topics list with counts.",
      },
      {
        label: "Batch Details & Subjects",
        method: "GET",
        url: detailsEndpoint,
        description: "Batch metadata, subjects list, and validity details.",
      },
      {
        label: "Batch Subjects",
        method: "GET",
        url: subjectsEndpoint,
        description: "Direct batch subjects proxy endpoint.",
      },
      {
        label: "Completed Batches",
        method: "GET",
        url: `${API_BASE}/v1/batches?page=1&limit=20`,
        description: "Completed batches list for website display.",
      },
      {
        label: "Direct S3 MP4 Video Stream",
        method: "GET",
        url: `${API_BASE}/v1/videos/{videoId}`,
        description: "Fetches video streaming metadata and direct S3 MP4 proxy URL.",
      },
      {
        label: "PDF Storage CDN",
        method: "GET",
        url: "https://static.pw.live/{attachmentKey}",
        description:
          "Direct PW CDN where PDFs and attachments are hosted using attachmentIds[].key.",
      },
    ],
    [v1Endpoint, topicsEndpoint, detailsEndpoint, subjectsEndpoint, mappedType],
  );

  const curlCommand = useMemo(() => {
    return `# 1. Fetch contents directly from Heroku proxy API:\ncurl -s "${v1Endpoint}"\n\n# 2. Fetch completed batches:\ncurl -s "${API_BASE}/v1/batches?page=1&limit=20"\n\n# 3. Fetch batch subjects:\ncurl -s "${subjectsEndpoint}"`;
  }, [v1Endpoint, subjectsEndpoint]);

  const jsonString = useMemo(() => {
    return JSON.stringify(
      {
        endpoint: v1Endpoint,
        proxyEndpoint,
        contentType: selectedContentType,
        mappedContentType: mappedType,
        topicId,
        topicName,
        totalItems: items.length,
        items,
      },
      null,
      2,
    );
  }, [v1Endpoint, proxyEndpoint, selectedContentType, mappedType, topicId, topicName, items]);

  const filteredJsonString = useMemo(() => {
    if (!searchQuery.trim()) return jsonString;
    const lines = jsonString.split("\n");
    const matching = lines.filter((line) => line.toLowerCase().includes(searchQuery.toLowerCase()));
    if (matching.length === 0) return `// No lines matching "${searchQuery}" in response JSON.`;
    return (
      `// Showing ${matching.length} matching lines out of ${lines.length} lines:\n` +
      matching.join("\n")
    );
  }, [jsonString, searchQuery]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-2 backdrop-blur-sm sm:p-4"
    >
      <div className="card-surface relative flex h-[90vh] max-h-[850px] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-surface px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-primary">
              <Code2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground sm:text-lg">
                  Live API &amp; Endpoints
                </h2>
                <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 text-[11px] font-mono font-bold text-emerald-500">
                  LIVE GET
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {topicName ? `Chapter: ${topicName}` : "Active Topic & Content Endpoints"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close API inspector"
            className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-surface-2 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Type Selector Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-surface-2/40 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span className="font-semibold text-foreground">Content Tab:</span>
            {(["Videos", "notes", "DppNotes", "Test"] as ContentType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedContentType(type)}
                className={`rounded-lg px-2.5 py-1 text-xs font-mono font-medium transition ${
                  selectedContentType === type
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "border border-border/60 bg-surface hover:bg-surface-2 text-muted-foreground"
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* View switcher */}
          <div className="flex items-center gap-1 rounded-lg border border-border/80 bg-surface p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setActiveView("json")}
              className={`rounded-md px-2.5 py-1 transition ${
                activeView === "json"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Response JSON
            </button>
            <button
              type="button"
              onClick={() => setActiveView("endpoints")}
              className={`rounded-md px-2.5 py-1 transition ${
                activeView === "endpoints"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              All Endpoints
            </button>
            <button
              type="button"
              onClick={() => setActiveView("curl")}
              className={`rounded-md px-2.5 py-1 transition ${
                activeView === "curl"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              cURL
            </button>
          </div>
        </div>

        {/* Active Primary Endpoint Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/80 bg-surface/50 px-4 py-2.5 sm:px-6 font-mono text-xs">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-black text-emerald-600 dark:text-emerald-400">
              GET
            </span>
            <span className="truncate text-muted-foreground select-all">{primaryEndpoint}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleCopy(primaryEndpoint, "endpoint")}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground transition hover:bg-surface-2"
              title="Copy URL"
            >
              {copiedKey === "endpoint" ? (
                <>
                  <Check className="h-3 w-3 text-emerald-500" />
                  <span className="text-emerald-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy URL</span>
                </>
              )}
            </button>
            <a
              href={primaryEndpoint}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-foreground transition hover:bg-surface-2"
              title="Open raw in new tab"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Open</span>
            </a>
          </div>
        </div>

        {/* Body based on active view */}
        <div className="flex-1 overflow-auto p-4 sm:p-6">
          {activeView === "json" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search in JSON keys or values..."
                    className="w-full rounded-lg border border-border bg-surface py-1.5 pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 top-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                  <span>
                    Items: <strong className="text-foreground">{items.length}</strong>
                  </span>
                  <span>
                    Status: <strong className="text-emerald-500">200 OK</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(jsonString, "fullJson")}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-surface-2"
                  >
                    {copiedKey === "fullJson" ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                        <span className="text-emerald-500">JSON Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Full JSON</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* JSON code container */}
              <div className="relative rounded-xl border border-border bg-[#0d1117] p-4 text-[#e6edf3] shadow-inner">
                {isLoading ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Fetching latest live data from endpoint…
                  </div>
                ) : (
                  <pre className="max-h-[500px] overflow-auto font-mono text-[12px] leading-relaxed select-text">
                    <code>{filteredJsonString}</code>
                  </pre>
                )}
              </div>
            </div>
          )}

          {activeView === "endpoints" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                All available backend microservice endpoints queried for batch{" "}
                <strong>{batchId}</strong>, subject <strong>{subjectId}</strong>, and topic{" "}
                <strong>{topicId}</strong>:
              </p>
              <div className="space-y-3">
                {allEndpoints.map((ep, idx) => (
                  <div key={idx} className="rounded-xl border border-border bg-surface p-4 text-xs">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-emerald-500">
                          {ep.method}
                        </span>
                        <span>{ep.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleCopy(ep.url, `ep-${idx}`)}
                          className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[11px] hover:bg-surface-2"
                        >
                          {copiedKey === `ep-${idx}` ? (
                            <span className="text-emerald-500">Copied</span>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <a
                          href={ep.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded border border-border px-2 py-0.5 text-[11px] hover:bg-surface-2"
                        >
                          <ExternalLink className="h-3 w-3" />
                          <span>Open</span>
                        </a>
                      </div>
                    </div>
                    <p className="mt-1 text-muted-foreground">{ep.description}</p>
                    <div className="mt-2.5 rounded-lg bg-surface-2/60 p-2 font-mono text-[11px] text-muted-foreground select-all break-all">
                      {ep.url}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeView === "curl" && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Copy and run this command in your terminal or API client (Postman, Insomnia) to test
                the live API:
              </p>
              <div className="relative rounded-xl border border-border bg-[#0d1117] p-4 text-[#e6edf3]">
                <button
                  type="button"
                  onClick={() => handleCopy(curlCommand, "curl")}
                  className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md border border-gray-700 bg-gray-800/80 px-2.5 py-1 text-xs text-gray-200 transition hover:bg-gray-700"
                >
                  {copiedKey === "curl" ? (
                    <>
                      <Check className="h-3 w-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      <span>Copy cURL</span>
                    </>
                  )}
                </button>
                <pre className="overflow-auto font-mono text-[12px] leading-relaxed">
                  <code>{curlCommand}</code>
                </pre>
              </div>

              <div className="rounded-xl border border-border bg-surface p-4 text-xs text-muted-foreground space-y-1">
                <p className="font-semibold text-foreground">API Details:</p>
                <p>
                  • Host: <span className="font-mono text-foreground">{API_BASE}</span>
                </p>
                <p>• Auth: Public unauthenticated educational gateway</p>
                <p>• Format: UTF-8 JSON</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border bg-surface px-4 py-2.5 text-xs text-muted-foreground sm:px-6">
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <Terminal className="h-3.5 w-3.5 text-primary" />
            <span>Target: {API_BASE.replace("https://", "")}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-surface-2 px-3 py-1 font-semibold text-foreground transition hover:bg-surface-3"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
