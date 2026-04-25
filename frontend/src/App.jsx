import {
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  SunMedium,
  UserRound
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  clearAllChats,
  createChat,
  deleteChat,
  fetchChat,
  fetchChats,
  fetchHealth,
  fetchMe,
  loginUser,
  logoutUser,
  pinChat,
  registerUser,
  renameChat,
  sendChatMessage,
  sendMessageFeedback,
  uploadAttachment
} from "./api";
import Composer from "./components/Composer";
import MessageBubble from "./components/MessageBubble";
import Sidebar from "./components/Sidebar";
import TypingIndicator from "./components/TypingIndicator";

const starterMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "## Welcome to Nova\n\nUse the sidebar for search, pinning, and history. You can also upload files, switch response style, and sign in to keep private chat history."
};

const suggestedPrompts = [
  "Summarize this topic like a teacher.",
  "Write a polished email asking for feedback.",
  "Plan a React + Flask portfolio app.",
  "Explain Python basics in 7 days."
];

function AuthPanel({ theme, mode, onModeChange, onSubmit, onClose }) {
  const isDark = theme === "dark";
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div
        className={`w-full max-w-md rounded-3xl p-6 ${
          isDark ? "bg-[#262626] text-slate-100" : "bg-white text-slate-900"
        } shadow-2xl`}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-400">
              {mode === "login" ? "Welcome back" : "Create account"}
            </p>
            <h3 className="mt-1 text-2xl font-semibold">
              {mode === "login" ? "Sign in" : "Sign up"}
            </h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-sm text-slate-500">
            Close
          </button>
        </div>

        <div className="space-y-3">
          {mode === "register" && (
            <input
              value={form.name}
              onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Name"
              className={`w-full rounded-2xl border px-4 py-3 outline-none ${
                isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50"
              }`}
            />
          )}
          <input
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
            placeholder="Email"
            className={`w-full rounded-2xl border px-4 py-3 outline-none ${
              isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50"
            }`}
          />
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Password"
            className={`w-full rounded-2xl border px-4 py-3 outline-none ${
              isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50"
            }`}
          />
        </div>

        <button
          type="button"
          onClick={() => onSubmit({ ...form, mode })}
          className={`mt-5 w-full rounded-2xl px-4 py-3 font-semibold ${
            isDark ? "bg-white text-slate-950" : "bg-slate-900 text-white"
          }`}
        >
          {mode === "login" ? "Sign in" : "Create account"}
        </button>

        <button
          type="button"
          onClick={() => onModeChange(mode === "login" ? "register" : "login")}
          className="mt-3 w-full text-sm text-emerald-400"
        >
          {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

function SettingsPanel({
  theme,
  onClose,
  responseStyle,
  onResponseStyleChange,
  providerInfo,
  onClearChats
}) {
  const isDark = theme === "dark";

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm">
      <div
        className={`w-full max-w-lg rounded-3xl p-6 ${
          isDark ? "bg-[#262626] text-slate-100" : "bg-white text-slate-900"
        } shadow-2xl`}
      >
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-sm text-emerald-400">Workspace settings</p>
            <h3 className="mt-1 text-2xl font-semibold">Customize Nova</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl px-3 py-2 text-sm text-slate-500">
            Close
          </button>
        </div>

        <div
          className={`rounded-2xl border p-4 ${
            isDark ? "border-white/10 bg-black/20" : "border-slate-200 bg-slate-50"
          }`}
        >
          <p className="text-sm font-medium">Provider</p>
          <p className="mt-1 text-sm text-slate-500">
            {providerInfo.provider} - {providerInfo.model}
          </p>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-sm font-medium">Response style</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {["balanced", "concise", "teacher"].map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => onResponseStyleChange(style)}
                className={`rounded-2xl border px-4 py-3 text-sm capitalize ${
                  responseStyle === style
                    ? isDark
                      ? "border-emerald-400/30 bg-emerald-500/10"
                      : "border-emerald-300 bg-emerald-50"
                    : isDark
                      ? "border-white/10 bg-black/20"
                      : "border-slate-200 bg-slate-50"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={onClearChats}
          className="mt-6 w-full rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 font-medium text-rose-600"
        >
          Clear all chats
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem("nova-theme") || "dark");
  const [responseStyle, setResponseStyle] = useState(
    () => localStorage.getItem("nova-response-style") || "balanced"
  );
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState("login");
  const [providerInfo, setProviderInfo] = useState({ provider: "demo", model: "demo-local" });
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([starterMessage]);
  const [draft, setDraft] = useState("");
  const [pendingUploads, setPendingUploads] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const transcriptRef = useRef(null);

  const isStarterScreen = activeChatId === null && messages[0]?.id === "welcome";
  const isDark = theme === "dark";
  const activeChatTitle = chats.find((chat) => chat.id === activeChatId)?.title || "New chat";
  const lastUserMessage = useMemo(
    () => [...messages].reverse().find((message) => message.role === "user"),
    [messages]
  );

  useEffect(() => {
    localStorage.setItem("nova-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("nova-response-style", responseStyle);
  }, [responseStyle]);

  useEffect(() => {
    loadBootstrap();
  }, []);

  useEffect(() => {
    loadChats(searchQuery);
  }, [searchQuery]);

  useEffect(() => {
    transcriptRef.current?.scrollTo({
      top: transcriptRef.current.scrollHeight,
      behavior: "smooth"
    });
  }, [messages, isLoading]);

  async function loadBootstrap() {
    const [health, me] = await Promise.all([fetchHealth(), fetchMe()]);
    setProviderInfo(health);
    setUser(me.user);
    await loadChats("");
  }

  async function loadChats(query = "", preferredChatId = null) {
    const data = await fetchChats(query);
    setChats(data.chats);

    const targetId = preferredChatId ?? activeChatId ?? data.chats[0]?.id ?? null;
    if (targetId) {
      await selectChat(targetId);
    } else {
      setActiveChatId(null);
      setMessages([starterMessage]);
    }
  }

  async function selectChat(chatId) {
    const data = await fetchChat(chatId);
    setActiveChatId(chatId);
    setMessages(data.messages.length ? data.messages : [starterMessage]);
    setMobileSidebarOpen(false);
  }

  async function handleNewChat() {
    const data = await createChat();
    await loadChats(searchQuery, data.chat.id);
  }

  async function handleRenameChat(chatId, title) {
    await renameChat(chatId, title);
    await loadChats(searchQuery, chatId);
  }

  async function handlePinChat(chatId, pinned) {
    await pinChat(chatId, pinned);
    await loadChats(searchQuery, chatId);
  }

  async function handleDeleteChat(chatId) {
    await deleteChat(chatId);
    await loadChats(searchQuery);
  }

  async function handleClearChats() {
    await clearAllChats();
    setSettingsOpen(false);
    await loadChats(searchQuery);
  }

  async function handleAuthSubmit(payload) {
    const data =
      payload.mode === "register"
        ? await registerUser(payload)
        : await loginUser(payload);
    setUser(data.user);
    setAuthOpen(false);
    await loadChats(searchQuery);
  }

  async function handleLogout() {
    await logoutUser();
    setUser(null);
    await loadChats(searchQuery);
  }

  async function handleUpload(files) {
    if (!files?.length) return;

    const uploaded = [];
    for (const file of files) {
      const data = await uploadAttachment({ file, chatId: activeChatId });
      uploaded.push(data.attachment);
    }
    setPendingUploads((current) => [...current, ...uploaded]);
  }

  async function handleSendMessage(messageOverride) {
    const text = (messageOverride ?? draft).trim();
    if (!text || isLoading) return;

    setStatusMessage("");
    setDraft("");
    setIsLoading(true);

    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text
    };
    const assistantMessageId = `assistant-${Date.now()}`;
    const assistantMessage = {
      id: assistantMessageId,
      role: "assistant",
      content: ""
    };

    setMessages((currentMessages) => {
      const baseMessages =
        activeChatId === null && currentMessages[0]?.id === "welcome" ? [] : currentMessages;
      return [...baseMessages, userMessage, assistantMessage];
    });

    let resolvedChatId = activeChatId;
    const uploads = [...pendingUploads];
    setPendingUploads([]);

    try {
      await sendChatMessage({
        chatId: activeChatId,
        message: text,
        responseStyle,
        attachments: uploads,
        onMeta: ({ chat_id: chatId }) => {
          resolvedChatId = chatId;
          setActiveChatId(chatId);
        },
        onToken: (token) => {
          setMessages((currentMessages) =>
            currentMessages.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: message.content + token }
                : message
            )
          );
        },
        onDone: async () => {
          await loadChats(searchQuery, resolvedChatId);
        },
        onError: (message) => {
          setStatusMessage(message);
        }
      });
    } catch (error) {
      setStatusMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleFeedback(messageId, feedback) {
    await sendMessageFeedback(messageId, feedback);
    setMessages((current) =>
      current.map((message) =>
        message.id === messageId ? { ...message, feedback } : message
      )
    );
  }

  return (
    <div
      className={`flex min-h-screen transition-colors duration-300 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-100 text-slate-900"
      }`}
    >
      {!sidebarCollapsed && mobileSidebarOpen && (
        <button
          type="button"
          onClick={() => setMobileSidebarOpen(false)}
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
        />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-30 md:static ${
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        } transition-transform duration-300`}
      >
        <Sidebar
          theme={theme}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          chats={chats}
          activeChatId={activeChatId}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed((current) => !current)}
          onNewChat={handleNewChat}
          onSelectChat={selectChat}
          onDeleteChat={handleDeleteChat}
          onRenameChat={handleRenameChat}
          onPinChat={handlePinChat}
        />
      </div>

      <main className={`relative flex min-w-0 flex-1 flex-col ${isDark ? "bg-[#212121]" : "bg-[#f7f7f8]"}`}>
        <header
          className={`relative flex items-center justify-between px-5 py-4 md:px-8 ${
            isDark ? "border-b border-white/5" : "border-b border-slate-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className={`rounded-xl p-2.5 md:hidden ${
                isDark ? "border border-white/10 bg-white/[0.04]" : "border border-slate-200 bg-white"
              }`}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
              isDark ? "bg-emerald-400/15 text-emerald-300" : "bg-emerald-100 text-emerald-700"
            }`}>
              <div className="h-2.5 w-2.5 rounded-full bg-current" />
            </div>
            <div>
              <p className={`text-sm font-medium ${isDark ? "text-slate-100" : "text-slate-800"}`}>
                {isStarterScreen ? "New chat" : activeChatTitle}
              </p>
              <p className="text-xs text-slate-500">
                {providerInfo.provider} - {providerInfo.model}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
              className={`rounded-xl p-2.5 transition ${
                isDark
                  ? "border border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {isDark ? <SunMedium className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className={`rounded-xl p-2.5 transition ${
                isDark
                  ? "border border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <Settings2 className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => (user ? handleLogout() : setAuthOpen(true))}
              className={`rounded-xl p-2.5 transition ${
                isDark
                  ? "border border-white/10 bg-white/[0.03] text-slate-200 hover:bg-white/[0.06]"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              <UserRound className="h-5 w-5" />
            </button>

            <button
              type="button"
              onClick={() => setSidebarCollapsed((current) => !current)}
              className={`hidden rounded-xl p-2.5 md:inline-flex ${
                isDark ? "border border-white/10 bg-white/[0.03] text-slate-200" : "border border-slate-200 bg-white text-slate-700"
              }`}
            >
              {sidebarCollapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
            </button>
          </div>
        </header>

        <section ref={transcriptRef} className="relative flex-1 overflow-y-auto px-4 py-6 md:px-8">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
            {isStarterScreen && (
              <div className="mb-8 pt-8 text-center animate-fade-in">
                <h2 className={`mx-auto max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl ${
                  isDark ? "text-slate-100" : "text-slate-900"
                }`}>
                  How can I help you today?
                </h2>

                <div className="mx-auto mt-10 grid w-full max-w-4xl gap-3 md:grid-cols-2">
                  {suggestedPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => setDraft(prompt)}
                      className={`rounded-2xl px-4 py-4 text-left text-sm leading-6 transition ${
                        isDark
                          ? "border border-white/8 bg-[#2a2a2a] text-slate-200 hover:bg-[#303030]"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className="animate-slide-up">
                <MessageBubble
                  message={message}
                  theme={theme}
                  isLatestAssistant={message.id === messages[messages.length - 1]?.id && message.role === "assistant"}
                  onRegenerate={() =>
                    lastUserMessage && handleSendMessage(lastUserMessage.content.split("\n\nAttached context:")[0])
                  }
                  onFeedback={handleFeedback}
                />
              </div>
            ))}

            {isLoading && !messages[messages.length - 1]?.content && (
              <TypingIndicator theme={theme} />
            )}

            {statusMessage && (
              <div className={`rounded-2xl px-4 py-3 text-sm ${
                isDark
                  ? "border border-rose-500/30 bg-rose-500/10 text-rose-200"
                  : "border border-rose-200 bg-rose-50 text-rose-700"
              }`}>
                {statusMessage}
              </div>
            )}
          </div>
        </section>

        <div className="relative px-4 pb-6 md:px-8">
          <Composer
            theme={theme}
            value={draft}
            uploads={pendingUploads}
            onUpload={handleUpload}
            onRemoveUpload={(attachmentId) =>
              setPendingUploads((current) => current.filter((item) => item.id !== attachmentId))
            }
            onChange={setDraft}
            onSubmit={() => handleSendMessage()}
            disabled={isLoading}
          />
        </div>
      </main>

      {settingsOpen && (
        <SettingsPanel
          theme={theme}
          onClose={() => setSettingsOpen(false)}
          responseStyle={responseStyle}
          onResponseStyleChange={setResponseStyle}
          providerInfo={providerInfo}
          onClearChats={handleClearChats}
        />
      )}

      {authOpen && (
        <AuthPanel
          theme={theme}
          mode={authMode}
          onModeChange={setAuthMode}
          onSubmit={handleAuthSubmit}
          onClose={() => setAuthOpen(false)}
        />
      )}
    </div>
  );
}
