import { useState, useRef, useEffect } from "react";
import { Moon, Sun, Check, Palette, X } from "lucide-react";
import { useTheme, THEME_COLOR_OPTIONS } from "@/hooks/use-theme";

export function UIColorPicker() {
  const { isDark, setTheme, colorScheme, setColorScheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const activeColor =
    THEME_COLOR_OPTIONS.find((c) => c.id === colorScheme) || THEME_COLOR_OPTIONS[0];

  return (
    <div className="relative inline-flex items-center" ref={containerRef}>
      {/* JUST A SINGLE SMALL CIRCLE BUTTON IN THE TOP RIGHT */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`h-8 w-8 rounded-full border border-border bg-card flex items-center justify-center transition-all cursor-pointer shadow-2xs hover:scale-105 relative ${
          isOpen ? "ring-2 ring-primary border-transparent" : "hover:bg-muted"
        }`}
        title="Change UI Colour & Theme (Dark/Light, Blue #25A7DA, Green #7CFC00)"
        aria-label="Change UI Colour & Theme"
        aria-expanded={isOpen}
      >
        <Palette className="h-4 w-4 text-foreground transition-transform hover:rotate-12" />
        {/* Miniature active accent color dot on the circle */}
        <span
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-card shadow-xs transition-colors"
          style={{ backgroundColor: activeColor.bgHex }}
        />
      </button>

      {/* Popover Menu with Options for Multiples */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="UI Colour & Theme Options"
          className="absolute right-0 top-full mt-2 w-72 rounded-2xl border border-border bg-card/98 backdrop-blur-md p-3.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-border">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🎨</span>
              <h4 className="text-xs font-bold text-foreground tracking-tight">
                UI Colour & Theme
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition cursor-pointer"
              aria-label="Close UI color popup"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Section 1: Theme Mode (Light / Dark) */}
          <div className="mb-3">
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5">
              Theme Mode
            </span>
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-muted/60 border border-border">
              <button
                type="button"
                onClick={() => setTheme("light")}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  !isDark
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sun className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span>Light</span>
                {!isDark && <Check className="h-3 w-3 stroke-[3] text-primary ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={() => setTheme("dark")}
                className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                  isDark
                    ? "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Moon className="h-3.5 w-3.5 text-indigo-400 fill-indigo-400/30" />
                <span>Dark</span>
                {isDark && <Check className="h-3 w-3 stroke-[3] text-primary ml-0.5" />}
              </button>
            </div>
          </div>

          {/* Section 2: UI Color Choices */}
          <div className="space-y-1.5">
            <span className="block text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1">
              Accent Colour
            </span>

            {THEME_COLOR_OPTIONS.map((col) => {
              const isSelected = colorScheme === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setColorScheme(col.id)}
                  className={`w-full flex items-center justify-between p-2 rounded-xl border text-left transition cursor-pointer ${
                    isSelected
                      ? "border-primary/60 bg-primary/10 shadow-2xs"
                      : "border-border hover:bg-muted/60 hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {/* Small circle indicator */}
                    <span
                      className="h-5 w-5 rounded-full flex items-center justify-center shadow-xs ring-1 ring-black/10 shrink-0"
                      style={{ backgroundColor: col.bgHex }}
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 stroke-[3]" style={{ color: col.textColor }} />
                      )}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-foreground leading-tight flex items-center gap-1.5">
                        <span>{col.label}</span>
                        {isSelected && (
                          <span className="text-[10px] font-extrabold text-primary">Active</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {col.code}
                      </span>
                    </div>
                  </div>

                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md border text-foreground"
                    style={{
                      borderColor: `${col.bgHex}40`,
                      backgroundColor: `${col.bgHex}15`,
                    }}
                  >
                    {col.code}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Live Preview Box */}
          <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Active:</span>
            <span
              className="inline-flex items-center gap-1 font-bold font-mono px-2 py-0.5 rounded-full text-xs shadow-2xs"
              style={{
                backgroundColor: activeColor.bgHex,
                color: activeColor.textColor,
              }}
            >
              ● {activeColor.label} ({activeColor.code})
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Mobile Sidebar Drawer Version of UI Color Controls
 */
export function UIColorPickerMobile() {
  const { isDark, setTheme, colorScheme, setColorScheme } = useTheme();

  return (
    <div className="space-y-3 p-3 rounded-xl bg-card border border-border">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-foreground">Theme & Colour</span>
        <span
          className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md"
          style={{
            backgroundColor:
              colorScheme === "blue" ? "#25A7DA" : colorScheme === "green" ? "#7CFC00" : "#2563eb",
            color: colorScheme === "green" ? "#000" : "#fff",
          }}
        >
          {colorScheme === "blue" ? "#25A7DA" : colorScheme === "green" ? "#7CFC00" : "#2563eb"}
        </span>
      </div>

      {/* Dark / Light Mode */}
      <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg bg-muted border border-border">
        <button
          type="button"
          onClick={() => setTheme("light")}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
            !isDark ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
          }`}
        >
          <Sun className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
          <span>Light</span>
          {!isDark && <Check className="h-3 w-3 stroke-[3] text-primary ml-0.5" />}
        </button>
        <button
          type="button"
          onClick={() => setTheme("dark")}
          className={`flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-bold transition cursor-pointer ${
            isDark ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
          }`}
        >
          <Moon className="h-3.5 w-3.5 text-indigo-400 fill-indigo-400/30" />
          <span>Dark</span>
          {isDark && <Check className="h-3 w-3 stroke-[3] text-primary ml-0.5" />}
        </button>
      </div>

      {/* Color Circles */}
      <div className="flex items-center justify-around gap-2 pt-1">
        {THEME_COLOR_OPTIONS.map((col) => {
          const isSelected = colorScheme === col.id;
          return (
            <button
              key={col.id}
              type="button"
              onClick={() => setColorScheme(col.id)}
              className={`flex-1 flex flex-col items-center gap-1.5 p-2 rounded-xl border transition cursor-pointer ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-2xs font-bold"
                  : "border-border hover:bg-muted"
              }`}
            >
              <span
                className="h-6 w-6 rounded-full flex items-center justify-center shadow-xs ring-1 ring-black/10"
                style={{ backgroundColor: col.bgHex }}
              >
                {isSelected && (
                  <Check className="h-3.5 w-3.5 stroke-[3]" style={{ color: col.textColor }} />
                )}
              </span>
              <span className="text-[11px] font-bold text-foreground">{col.label}</span>
              <span className="text-[9px] font-mono text-muted-foreground">{col.code}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
