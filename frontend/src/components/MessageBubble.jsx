import { Bot, Check, Copy, RefreshCw, ThumbsDown, ThumbsUp, User } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function MessageBubble({
  message,
  theme,
  isLatestAssistant,
  onRegenerate,
  onFeedback
}) {
  const [copied, setCopied] = useState(false);
  const isAssistant = message.role === "assistant";
  const isUser = message.role === "user";
  const isDark = theme === "dark";

  async function copyMessage() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`flex w-full items-start gap-3 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div
          className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isDark ? "bg-white/8 text-slate-200" : "bg-white text-slate-700 ring-1 ring-slate-200"
          }`}
        >
          <Bot className="h-5 w-5" />
        </div>
      )}

      <div className={`min-w-0 flex-1 ${isUser ? "max-w-4xl" : "max-w-[calc(100%-3rem)]"}`}>
        <div
          className={`${
            isUser
              ? isDark
                ? "rounded-[24px] bg-[#303030] px-4 py-3"
                : "rounded-[24px] bg-[#eef1f4] px-4 py-3"
              : "px-1 py-1"
          }`}
        >
          {isAssistant && (
            <div className="mb-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    isDark ? "bg-white/[0.05] text-slate-200" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Bot className="h-3.5 w-3.5" />
                </div>
                <p className={`text-sm font-semibold ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                  Nova
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isLatestAssistant && (
                  <button
                    type="button"
                    onClick={onRegenerate}
                    className={`rounded-lg p-1.5 ${isDark ? "text-slate-400 hover:bg-white/[0.06]" : "text-slate-500 hover:bg-slate-100"}`}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onFeedback?.(message.id, message.feedback === "up" ? "" : "up")}
                  className={`rounded-lg p-1.5 ${
                    message.feedback === "up"
                      ? "text-emerald-400"
                      : isDark
                        ? "text-slate-400 hover:bg-white/[0.06]"
                        : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <ThumbsUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onFeedback?.(message.id, message.feedback === "down" ? "" : "down")}
                  className={`rounded-lg p-1.5 ${
                    message.feedback === "down"
                      ? "text-rose-400"
                      : isDark
                        ? "text-slate-400 hover:bg-white/[0.06]"
                        : "text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  <ThumbsDown className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={copyMessage}
                  className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                    isDark
                      ? "bg-white/[0.03] text-slate-300 hover:bg-white/[0.06] hover:text-slate-100"
                      : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {isAssistant ? (
            <div className={`markdown-copy text-[15px] ${isDark ? "text-white" : "text-black"}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
            </div>
          ) : (
            <p className={`whitespace-pre-wrap text-[15px] leading-7 ${isDark ? "text-white" : "text-black"}`}>
              {message.content}
            </p>
          )}
        </div>
      </div>

      {isUser && (
        <div
          className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isDark ? "bg-emerald-400 text-slate-950" : "bg-emerald-500 text-white"
          }`}
        >
          <User className="h-4 w-4" />
        </div>
      )}
    </div>
  );
}
