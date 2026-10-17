/**
 * In-memory client-side message cache for DonChat.
 * Powers 0ms instant chat transitions with background stale-while-revalidate.
 */

const messageCache = new Map();

export const getCacheKey = (id, type = 'conversation') => {
  if (!id) return null;
  return `${type}_${String(id)}`;
};

export const getCachedMessages = (key) => {
  if (!key) return null;
  const entry = messageCache.get(key);
  return entry ? [...entry] : null;
};

export const setCachedMessages = (key, messages) => {
  if (!key || !Array.isArray(messages)) return;
  messageCache.set(key, [...messages]);
};

export const appendMessageToCache = (key, newMsg) => {
  if (!key || !newMsg) return;
  const existing = messageCache.get(key) || [];
  const msgIdStr = String(newMsg._id || newMsg.id || '');

  // If this message already exists (or replaces a pending/temp optimistic message)
  const tempIdx = existing.findIndex(m =>
    (m.pending && m._id && typeof m._id === 'string' && m._id.startsWith('temp_')) ||
    String(m._id || m.id) === msgIdStr
  );

  if (tempIdx !== -1) {
    const updated = [...existing];
    updated[tempIdx] = newMsg;
    messageCache.set(key, updated);
  } else {
    // Avoid duplicates
    if (!existing.some(m => String(m._id || m.id) === msgIdStr)) {
      messageCache.set(key, [...existing, newMsg]);
    }
  }
};

export const updateMessageInCache = (key, messageId, updater) => {
  if (!key) return;
  const existing = messageCache.get(key);
  if (!existing) return;
  const msgIdStr = String(messageId);
  const updated = existing.map(m => {
    if (String(m._id || m.id) === msgIdStr) {
      return typeof updater === 'function' ? updater(m) : { ...m, ...updater };
    }
    return m;
  });
  messageCache.set(key, updated);
};

export const removeMessageFromCache = (key, messageId) => {
  if (!key) return;
  const existing = messageCache.get(key);
  if (!existing) return;
  const msgIdStr = String(messageId);
  messageCache.set(key, existing.filter(m => String(m._id || m.id) !== msgIdStr));
};

export const updateMessageInAllCaches = (messageId, updater) => {
  const msgIdStr = String(messageId);
  for (const [key, list] of messageCache.entries()) {
    if (list.some(m => String(m._id || m.id) === msgIdStr)) {
      messageCache.set(key, list.map(m => {
        if (String(m._id || m.id) === msgIdStr) {
          return typeof updater === 'function' ? updater(m) : { ...m, ...updater };
        }
        return m;
      }));
    }
  }
};

export const removeMessageFromAllCaches = (messageId) => {
  const msgIdStr = String(messageId);
  for (const [key, list] of messageCache.entries()) {
    if (list.some(m => String(m._id || m.id) === msgIdStr)) {
      messageCache.set(key, list.filter(m => String(m._id || m.id) !== msgIdStr));
    }
  }
};

export const markReadInAllCaches = (readConvId, readSpaceId, readerPersonaId) => {
  for (const [key, list] of messageCache.entries()) {
    const isConv = readConvId && key === `conversation_${String(readConvId)}`;
    const isSpace = readSpaceId && key === `space_${String(readSpaceId)}`;
    if (isConv || isSpace) {
      messageCache.set(key, list.map(m => ({
        ...m,
        status: 'read',
        read: true,
        isRead: true,
        readBy: Array.from(new Set([...(m.readBy || []), readerPersonaId].filter(Boolean)))
      })));
    }
  }
};

export const clearMessageCache = () => {
  messageCache.clear();
};
