"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Loader2, Send, Sprout } from "lucide-react";
import { askCoach } from "@/lib/actions";
import type { CoachAnswer } from "@/lib/domain/coach";

interface Message {
  role: "user" | "coach";
  text: string;
  bullets?: string[];
}

export function CoachChat({ opening, suggestions }: { opening: string; suggestions: string[] }) {
  const [messages, setMessages] = useState<Message[]>([{ role: "coach", text: opening }]);
  const [input, setInput] = useState("");
  const [chips, setChips] = useState(suggestions);
  const [pending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  const send = (question: string) => {
    const q = question.trim();
    if (!q || pending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: q }]);
    startTransition(async () => {
      const answer: CoachAnswer = await askCoach(q);
      setMessages((m) => [...m, { role: "coach", text: answer.text, bullets: answer.bullets }]);
      if (answer.suggestions.length > 0) setChips(answer.suggestions);
    });
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-10.5rem)] max-w-3xl flex-col rounded-2xl border border-border bg-surface">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-3.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-white">
          <Sprout size={16} aria-hidden />
        </span>
        <div>
          <h1 className="text-sm font-bold">Sage Coach</h1>
          <p className="text-[11px] text-faint">Grounded in your real numbers · nothing is guessed</p>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5" aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                m.role === "user"
                  ? "max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-2.5 text-sm text-white"
                  : "max-w-[85%] rounded-2xl rounded-bl-md bg-surface-2 px-4 py-2.5 text-sm"
              }
            >
              <p className="leading-relaxed">{m.text}</p>
              {m.bullets && m.bullets.length > 0 && (
                <ul className="mt-2 space-y-1 border-t border-border/60 pt-2">
                  {m.bullets.map((b, j) => (
                    <li key={j} className="flex gap-2 text-[13px] leading-relaxed text-muted">
                      <span className="text-accent">•</span>
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
        {pending && (
          <div className="flex items-center gap-2 text-xs text-faint">
            <Loader2 size={13} className="animate-spin" aria-hidden /> Crunching your numbers…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {chips.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="rounded-full border border-border px-3 py-1.5 text-xs text-muted transition-colors hover:border-accent hover:text-accent"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your money…"
            aria-label="Ask the coach a question"
            className="flex-1 rounded-xl border border-border bg-surface-2 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            aria-label="Send question"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Send size={15} aria-hidden />
          </button>
        </form>
      </div>
    </div>
  );
}
