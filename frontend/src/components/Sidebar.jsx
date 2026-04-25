import { Edit3, Menu, MessageSquarePlus, Pencil, Pin, Search, Trash2, X } from "lucide-react";
import { useState } from "react";

function SidebarItem({
  theme,
  chat,
  isActive,
  onSelect,
  onDelete,
  onRename,
  onPin
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draftTitle, setDraftTitle] = useState(chat.title);
  const isDark = theme === "dark";

  function submitRename() {
    const title = draftTitle.trim();
    if (!title) {
      setDraftTitle(chat.title);
      setIsEditing(false);
      return;
    }
    onRename(chat.id, title);
    setIsEditing(false);
  }

  return (
    <div
      className={`group rounded-2xl border px-3 py-3 transition ${
        isDark
          ? isActive
            ? "border-emerald-400/20 bg-white/[0.06]"
            : "border-transparent bg-transparent hover:border-white/6 hover:bg-white/[0.04]"
          : isActive
            ? "border-emerald-200 bg-emerald-50"
            : "border-transparent bg-transparent hover:border-slate-200 hover:bg-white"
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => onSelect(chat.id)}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <div
            className={`mt-0.5 rounded-xl p-2 ${
              isDark
                ? "bg-white/[0.06] text-slate-300 ring-1 ring-white/5"
                : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            <Edit3 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <input
                autoFocus
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.target.value)}
                onBlur={submitRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    submitRename();
                  }
                  if (event.key === "Escape") {
                    setDraftTitle(chat.title);
                    setIsEditing(false);
                  }
                }}
                className={`w-full rounded-xl px-3 py-2 text-sm outline-none ${
                  isDark
                    ? "border border-white/10 bg-slate-950 text-slate-100"
                    : "border border-slate-200 bg-white text-slate-900"
                }`}
              />
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <p className={`truncate text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                    {chat.title}
                  </p>
                  {chat.pinned && <Pin className="h-3.5 w-3.5 text-emerald-400" />}
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {new Date(chat.updated_at).toLocaleDateString()}
                </p>
              </>
            )}
          </div>
        </button>

        <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onPin(chat.id, !chat.pinned)}
            className={`rounded-lg p-2 ${
              isDark
                ? "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Pin className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className={`rounded-lg p-2 ${
              isDark
                ? "text-slate-400 hover:bg-white/[0.06] hover:text-slate-100"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(chat.id)}
            className={`rounded-lg p-2 ${
              isDark
                ? "text-slate-400 hover:bg-white/[0.06] hover:text-rose-300"
                : "text-slate-500 hover:bg-slate-100 hover:text-rose-500"
            }`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Sidebar({
  theme,
  searchQuery,
  onSearchChange,
  chats,
  activeChatId,
  collapsed,
  onToggle,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  onRenameChat,
  onPinChat
}) {
  const isDark = theme === "dark";

  return (
    <aside
      className={`h-full ${
        collapsed ? "w-[72px]" : "w-full max-w-[280px]"
      } transition-all duration-300 ${
        isDark ? "border-r border-white/6 bg-[#171717]" : "border-r border-slate-200 bg-[#f9f9f9]"
      }`}
    >
      <div className="flex h-full flex-col">
        <div className={`px-4 py-4 ${isDark ? "border-b border-white/6" : "border-b border-slate-200"}`}>
          {!collapsed && (
            <>
              <div className="mb-4">
                <p className="text-[11px] uppercase tracking-[0.24em] text-slate-500">Chats</p>
                <h2 className={`mt-2 text-base font-medium ${isDark ? "text-white" : "text-slate-900"}`}>Nova</h2>
              </div>

              <div className={`mb-3 flex items-center gap-2 rounded-2xl px-3 py-2 ${isDark ? "border border-white/8 bg-white/[0.03]" : "border border-slate-200 bg-white"}`}>
                <Search className="h-4 w-4 text-slate-500" />
                <input
                  value={searchQuery}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Search chats"
                  className="w-full bg-transparent text-sm outline-none"
                />
              </div>
            </>
          )}

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onToggle}
              className={`rounded-xl p-2.5 ${
                isDark
                  ? "border border-white/8 bg-white/[0.04] text-slate-200 hover:border-white/12 hover:bg-white/[0.06]"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {collapsed ? <Menu className="h-5 w-5" /> : <X className="h-5 w-5" />}
            </button>

            {!collapsed && (
              <button
                type="button"
                onClick={onNewChat}
                className={`flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition ${
                  isDark ? "bg-white text-slate-950 hover:bg-slate-200" : "bg-slate-900 text-white hover:bg-slate-700"
                }`}
              >
                <MessageSquarePlus className="h-4 w-4" />
                New Chat
              </button>
            )}
          </div>
        </div>

        {collapsed ? (
          <div className="flex flex-1 items-start justify-center p-4">
            <button
              type="button"
              onClick={onNewChat}
              className={`rounded-2xl p-3 ${
                isDark
                  ? "border border-white/8 bg-white/[0.04] text-slate-100 hover:border-white/12 hover:bg-white/[0.06]"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <MessageSquarePlus className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4">
            <p className="mb-3 px-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              Recent Chats
            </p>
            {chats.length === 0 ? (
              <div
                className={`rounded-3xl border p-5 text-sm leading-6 ${
                  isDark
                    ? "border-dashed border-white/8 bg-white/[0.03] text-slate-400"
                    : "border-dashed border-slate-200 bg-white text-slate-500"
                }`}
              >
                Start a new chat to see your conversation history here.
              </div>
            ) : (
              <div className="space-y-2">
                {chats.map((chat) => (
                  <SidebarItem
                    key={chat.id}
                    theme={theme}
                    chat={chat}
                    isActive={activeChatId === chat.id}
                    onSelect={onSelectChat}
                    onDelete={onDeleteChat}
                    onRename={onRenameChat}
                    onPin={onPinChat}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
