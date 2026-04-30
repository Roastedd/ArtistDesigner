"use client";

import { useState, useRef, useTransition } from "react";
import { MessageSquarePlus, X, Send, CheckCircle, Loader2 } from "lucide-react";
import { submitFeedback } from "./feedback-action";

type Step = "closed" | "open" | "sent";

const EMOJI_OPTIONS = [
  { value: "love", label: "😍", title: "Love it" },
  { value: "good", label: "👍", title: "Good" },
  { value: "meh", label: "😐", title: "Meh" },
  { value: "broken", label: "🐛", title: "Something's broken" },
];

export function FeedbackWidget() {
  const [step, setStep] = useState<Step>("closed");
  const [emoji, setEmoji] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function open() {
    setStep("open");
    setEmoji(null);
    setText("");
    setTimeout(() => textareaRef.current?.focus(), 60);
  }

  function close() {
    setStep("closed");
  }

  function send() {
    if (!text.trim() && !emoji) return;
    startTransition(async () => {
      await submitFeedback({ emoji: emoji ?? undefined, message: text.trim() });
      setStep("sent");
      setTimeout(() => setStep("closed"), 2500);
    });
  }

  return (
    <div className="fixed bottom-20 right-4 md:bottom-5 md:right-5 z-40 flex flex-col items-end gap-2 safe-bottom">
      {/* Popover */}
      {step === "open" && (
        <div
          className="w-72 rounded-2xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] shadow-2xl animate-[fadeSlideDown_180ms_ease_both]"
          style={{ transformOrigin: "bottom right" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-3">
            <span className="text-sm font-semibold">Send feedback</span>
            <button
              onClick={close}
              aria-label="Close"
              className="rounded-md p-0.5 text-[color:var(--color-muted)] transition-colors hover:text-[color:var(--color-fg)]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-3">
            {/* Emoji row */}
            <div className="flex justify-around">
              {EMOJI_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  title={opt.title}
                  onClick={() => setEmoji(emoji === opt.value ? null : opt.value)}
                  className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all ${
                    emoji === opt.value
                      ? "bg-[color:var(--color-accent)]/20 ring-2 ring-[color:var(--color-accent)] scale-110"
                      : "hover:bg-[color:var(--color-bg)] hover:scale-110"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Text */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
              }}
              placeholder="Tell us what's on your mind…"
              rows={3}
              maxLength={1000}
              className="input resize-none text-sm leading-relaxed"
            />

            <div className="flex items-center justify-between">
              <span className="text-xs text-[color:var(--color-muted)]">
                {text.length > 0 ? `${text.length}/1000` : "⌘↵ to send"}
              </span>
              <button
                onClick={send}
                disabled={pending || (!text.trim() && !emoji)}
                className="btn gap-1.5 px-3 py-1.5 text-sm"
              >
                {pending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sent confirmation */}
      {step === "sent" && (
        <div className="flex items-center gap-2 rounded-xl border border-[color:var(--color-border)] bg-[color:var(--color-bg-elev)] px-4 py-3 text-sm shadow-xl animate-[fadeSlideDown_180ms_ease_both]">
          <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
          Thanks for the feedback!
        </div>
      )}

      {/* FAB trigger */}
      {step !== "sent" && (
        <button
          onClick={step === "open" ? close : open}
          aria-label="Send feedback"
          className={`flex h-11 w-11 items-center justify-center rounded-full shadow-lg transition-all duration-200 ${
            step === "open"
              ? "bg-[color:var(--color-bg-elev)] border border-[color:var(--color-border)] text-[color:var(--color-muted)] rotate-0"
              : "bg-[color:var(--color-accent)] text-[color:var(--color-accent-fg)] hover:opacity-90 hover:scale-105"
          }`}
          style={
            step !== "open"
              ? { boxShadow: "0 0 18px color-mix(in srgb, var(--color-accent) 35%, transparent)" }
              : undefined
          }
        >
          {step === "open" ? (
            <X className="h-4 w-4" />
          ) : (
            <MessageSquarePlus className="h-5 w-5" />
          )}
        </button>
      )}
    </div>
  );
}
