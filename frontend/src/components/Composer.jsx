import { CornerDownLeft, Paperclip, SendHorizontal, X } from "lucide-react";

export default function Composer({
  theme,
  value,
  uploads,
  onUpload,
  onRemoveUpload,
  onChange,
  onSubmit,
  disabled
}) {
  const isDark = theme === "dark";

  return (
    <div className={`sticky bottom-0 mt-6 pt-5 ${isDark ? "bg-gradient-to-t from-[#212121] via-[#212121]/96 to-transparent" : "bg-gradient-to-t from-[#f7f7f8] via-[#f7f7f8]/96 to-transparent"}`}>
      <div
        className={`mx-auto max-w-3xl rounded-[26px] p-3.5 backdrop-blur ${
          isDark
            ? "bg-[#2b2b2b] shadow-[0_18px_40px_rgba(0,0,0,0.22)]"
            : "bg-white shadow-[0_16px_34px_rgba(15,23,42,0.08)]"
        }`}
      >
        {uploads.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs ${
                  isDark ? "bg-white/[0.06] text-slate-200" : "bg-slate-100 text-slate-700"
                }`}
              >
                {upload.filename}
                <button type="button" onClick={() => onRemoveUpload(upload.id)}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSubmit();
            }
          }}
          rows={1}
          placeholder="Message Nova..."
          disabled={disabled}
          className={`max-h-56 min-h-20 w-full resize-none bg-transparent text-[15px] leading-7 outline-none placeholder:text-slate-500 ${
            isDark ? "text-white" : "text-black"
          }`}
        />

        <div className="mt-3 flex flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <label className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-3 py-2 ${isDark ? "hover:bg-white/[0.05]" : "hover:bg-slate-100"}`}>
              <Paperclip className="h-4 w-4" />
              Upload file
              <input
                type="file"
                multiple
                className="hidden"
                onChange={(event) => onUpload(Array.from(event.target.files || []))}
              />
            </label>
            <div className="flex items-center gap-2">
              <CornerDownLeft className="h-4 w-4" />
              Press Enter to send. Shift + Enter for a new line.
            </div>
          </div>

          <button
            type="button"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
            className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed ${
              isDark
                ? "bg-white text-slate-950 hover:bg-slate-200 disabled:bg-slate-700 disabled:text-slate-400"
                : "bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-500"
            }`}
          >
            <SendHorizontal className="h-4 w-4" />
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
