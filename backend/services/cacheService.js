const store = new Map();

const now = () => Date.now();

const getEntry = (key) => {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt <= now()) {
    store.delete(key);
    return null;
  }
  return entry;
};

const getCache = (key) => {
  const entry = getEntry(key);
  return entry ? entry.value : null;
};

const setCache = (key, value, options = {}) => {
  const ttlMs = Number(options.ttlMs || 60_000);
  const tags = Array.isArray(options.tags) ? options.tags : [];
  const expiresAt = ttlMs > 0 ? now() + ttlMs : null;
  store.set(key, { value, expiresAt, tags });
  return value;
};

const delCache = (key) => store.delete(key);

const invalidateTag = (tag) => {
  for (const [key, entry] of store.entries()) {
    if ((entry.tags || []).includes(tag)) {
      store.delete(key);
    }
  }
};

const invalidateByPrefix = (prefix) => {
  for (const key of store.keys()) {
    if (String(key).startsWith(prefix)) {
      store.delete(key);
    }
  }
};

const clearCache = () => store.clear();

const cached = async (key, resolver, options = {}) => {
  const existing = getCache(key);
  if (existing !== null) return existing;
  const value = await resolver();
  setCache(key, value, options);
  return value;
};

module.exports = {
  getCache,
  setCache,
  delCache,
  invalidateTag,
  invalidateByPrefix,
  clearCache,
  cached,
};
