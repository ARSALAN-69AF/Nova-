const API_BASE = import.meta.env.VITE_API_BASE_URL || "";

async function parseJson(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || "Request failed");
  }
  return data;
}

export async function fetchHealth() {
  const response = await fetch(`${API_BASE}/api/health`);
  return parseJson(response);
}

export async function fetchMe() {
  const response = await fetch(`${API_BASE}/api/auth/me`, {
    credentials: "include"
  });
  return parseJson(response);
}

export async function registerUser(payload) {
  const response = await fetch(`${API_BASE}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });
  return parseJson(response);
}

export async function loginUser(payload) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload)
  });
  return parseJson(response);
}

export async function logoutUser() {
  const response = await fetch(`${API_BASE}/api/auth/logout`, {
    method: "POST",
    credentials: "include"
  });
  return parseJson(response);
}

export async function fetchChats(query = "") {
  const search = query ? `?q=${encodeURIComponent(query)}` : "";
  const response = await fetch(`${API_BASE}/api/chats${search}`, {
    credentials: "include"
  });
  return parseJson(response);
}

export async function fetchChat(chatId) {
  const response = await fetch(`${API_BASE}/api/chats/${chatId}`, {
    credentials: "include"
  });
  return parseJson(response);
}

export async function createChat() {
  const response = await fetch(`${API_BASE}/api/chats`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ title: "New Chat" })
  });
  return parseJson(response);
}

export async function renameChat(chatId, title) {
  const response = await fetch(`${API_BASE}/api/chats/${chatId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ title })
  });
  return parseJson(response);
}

export async function pinChat(chatId, pinned) {
  const response = await fetch(`${API_BASE}/api/chats/${chatId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ pinned })
  });
  return parseJson(response);
}

export async function deleteChat(chatId) {
  const response = await fetch(`${API_BASE}/api/chats/${chatId}`, {
    method: "DELETE",
    credentials: "include"
  });
  return parseJson(response);
}

export async function clearAllChats() {
  const response = await fetch(`${API_BASE}/api/chats`, {
    method: "DELETE",
    credentials: "include"
  });
  return parseJson(response);
}

export async function uploadAttachment({ file, chatId }) {
  const formData = new FormData();
  formData.append("file", file);
  if (chatId) {
    formData.append("chat_id", chatId);
  }

  const response = await fetch(`${API_BASE}/api/uploads`, {
    method: "POST",
    credentials: "include",
    body: formData
  });
  return parseJson(response);
}

export async function sendMessageFeedback(messageId, feedback) {
  const response = await fetch(`${API_BASE}/api/messages/${messageId}/feedback`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ feedback })
  });
  return parseJson(response);
}

export async function sendChatMessage({
  chatId,
  message,
  responseStyle,
  attachments,
  onMeta,
  onToken,
  onDone,
  onError
}) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      chat_id: chatId,
      message,
      response_style: responseStyle,
      attachments
    })
  });

  if (!response.ok || !response.body) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Unable to stream response");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const eventChunk of events) {
      const lines = eventChunk.split("\n");
      const eventName = lines.find((line) => line.startsWith("event:"))?.replace("event:", "").trim();
      const dataLine = lines.find((line) => line.startsWith("data:"))?.replace("data:", "").trim();
      if (!eventName || !dataLine) {
        continue;
      }

      const payload = JSON.parse(dataLine);
      if (eventName === "meta") {
        onMeta?.(payload);
      } else if (eventName === "token") {
        onToken?.(payload.content || "");
      } else if (eventName === "done") {
        onDone?.(payload);
      } else if (eventName === "error") {
        onError?.(payload.message || "Stream failed");
      }
    }
  }
}
