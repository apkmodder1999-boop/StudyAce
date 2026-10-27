import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { FileText, Eye, Download, X } from "lucide-react";

export type PDFDocument = {
  name: string;
  url: string;
};

interface PDFActionDialogProps {
  document: PDFDocument | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function extractPdfFilename(doc: PDFDocument | null): string {
  if (!doc) return "document.pdf";
  if (doc.name && doc.name.toLowerCase().endsWith(".pdf")) {
    return doc.name;
  }
  try {
    const urlObj = new URL(doc.url);
    const lastSeg = urlObj.pathname.split("/").filter(Boolean).pop();
    if (lastSeg && lastSeg.toLowerCase().endsWith(".pdf")) {
      return decodeURIComponent(lastSeg);
    }
  } catch {
    // fallback
  }
  const clean = doc.name.replace(/[^a-zA-Z0-9-_ ]/g, "").trim();
  return clean ? `${clean}.pdf` : "document.pdf";
}

async function downloadPdfFile(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      return;
    }
  } catch {
    // If CORS prevents fetch, fallback to standard link download
  }

  const a = window.document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.download = filename;
  window.document.body.appendChild(a);
  a.click();
  window.document.body.removeChild(a);
}

export function PDFActionDialog({ document: doc, open, onOpenChange }: PDFActionDialogProps) {
  if (!doc) return null;

  const filename = extractPdfFilename(doc);

  const handleSee = () => {
    if (doc.url) {
      window.open(doc.url, "_blank", "noopener,noreferrer");
    }
  };

  const handleDownload = () => {
    if (doc.url) {
      downloadPdfFile(doc.url, filename);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-[92vw] p-5 sm:p-6 bg-card border border-border rounded-2xl shadow-xl">
        {/* Header: Orange [ PDF ] badge, document title, and ✕ close button */}
        <DialogHeader className="flex flex-row items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="px-2 py-0.5 rounded-md bg-orange-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 font-black text-[11px] tracking-wider uppercase shrink-0">
              PDF
            </span>
            <DialogTitle className="text-sm sm:text-base font-bold text-foreground truncate min-w-0">
              {doc.name || "Document"}
            </DialogTitle>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer shrink-0"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </DialogHeader>

        {/* Body: Centered document icon, document title, and filename pill */}
        <div className="flex flex-col items-center justify-center text-center py-5 px-2">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-500 border border-orange-500/25 mb-3 shadow-inner">
            <FileText className="h-8 w-8" />
          </div>

          <h3 className="text-sm sm:text-base font-bold text-foreground max-w-sm leading-snug line-clamp-2">
            {doc.name || "Document"}
          </h3>

          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-xs text-muted-foreground font-mono truncate max-w-[280px]">
            <span className="truncate">{filename}</span>
          </div>
        </div>

        {/* Two side-by-side buttons: See (Bright Blue) and Download (Bright Green) */}
        <div className="grid grid-cols-2 gap-3 w-full pt-3 border-t border-border">
          {/* 👁️ "See" (Bright Blue button): Opens direct link in new tab */}
          <button
            type="button"
            onClick={handleSee}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-xs sm:text-sm py-2.5 px-4 shadow-sm shadow-blue-600/20 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Eye className="h-4 w-4" />
            <span>See</span>
          </button>

          {/* 📥 "Download" (Bright Green button): Directly downloads/saves PDF */}
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs sm:text-sm py-2.5 px-4 shadow-sm shadow-emerald-600/20 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
