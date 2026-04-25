export default function TypingIndicator({ theme }) {
  const isDark = theme === "dark";

  return (
    <div
      className={`flex items-center gap-2 rounded-full px-4 py-3 text-sm ${
        isDark
          ? "border border-slate-800 bg-slate-900/80 text-slate-400"
          : "border border-slate-200 bg-white text-slate-500"
      }`}
    >
      <span className="flex gap-1">
        <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.2s]"></span>
        <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400 [animation-delay:-0.1s]"></span>
        <span className="h-2 w-2 animate-bounce rounded-full bg-emerald-400"></span>
      </span>
      Nova is thinking...
    </div>
  );
}
