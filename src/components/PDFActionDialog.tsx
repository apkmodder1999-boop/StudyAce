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
      <DialogContent className="w-[92vw] max-w-[380px] sm:max-w-md p-0 gap-0 bg-[#0b1422] border border-[#1d2d42] rounded-3xl overflow-hidden shadow-2xl shadow-black/70 [&>button.absolute]:hidden">
        {/* Header: Orange [ PDF ] badge, document title, and single clean ✕ close button */}
        <DialogHeader className="flex flex-row items-center justify-between gap-2.5 px-5 py-4 border-b border-white/[0.08] bg-[#0b1422] space-y-0 text-left">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-500 font-bold text-[11px] tracking-wide shrink-0">
              PDF
            </span>
            <DialogTitle className="text-sm sm:text-base font-semibold text-white truncate min-w-0">
              {doc.name || "Document"}
            </DialogTitle>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer shrink-0 ml-1"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </DialogClose>
        </DialogHeader>

        {/* Body: Squircle document icon, document title, and filename pill */}
        <div className="flex flex-col items-center justify-center text-center px-5 py-7 space-y-4 bg-[#0b1422]">
          {/* Rounded Squircle Container with Document Icon */}
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[#26170e] border border-amber-600/30 text-amber-500 shadow-inner">
            <FileText className="h-10 w-10 stroke-[1.8]" />
          </div>

          {/* Document Title */}
          <h3 className="text-base sm:text-lg font-bold text-white max-w-[92%] leading-snug line-clamp-2">
            {doc.name || "Document"}
          </h3>

          {/* Filename Pill Container */}
          <div className="w-full max-w-[92%] px-3.5 py-2 rounded-xl bg-[#091524] border border-[#1b344d] text-xs text-sky-200/70 font-mono truncate text-center shadow-inner">
            {filename}
          </div>
        </div>

        {/* Action Buttons: See (Vibrant Blue) & Download (Vibrant Green) */}
        <div className="flex items-center gap-3 w-full px-5 py-4 border-t border-white/[0.08] bg-[#0b1422]">
          {/* 👁️ "See" (Bright Blue button): Opens direct link in new tab */}
          <button
            type="button"
            onClick={handleSee}
            className="flex-1 h-12 rounded-2xl bg-[#0066ff] hover:bg-[#0055d4] active:bg-[#0047b3] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Eye className="h-4 w-4" />
            <span>See</span>
          </button>

          {/* 📥 "Download" (Bright Green button): Directly downloads/saves PDF */}
          <button
            type="button"
            onClick={handleDownload}
            className="flex-1 h-12 rounded-2xl bg-[#02a95c] hover:bg-[#029350] active:bg-[#017e44] text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
