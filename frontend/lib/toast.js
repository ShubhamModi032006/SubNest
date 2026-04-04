const listeners = new Set();

const dispatchToast = (type, message, options = {}) => {
  const payload = {
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    message,
    duration: options.duration ?? 4000,
    createdAt: new Date().toISOString(),
  };

  listeners.forEach((listener) => listener(payload));
  return payload.id;
};

export const subscribeToToasts = (listener) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const showSuccess = (message, options) => dispatchToast("success", message, options);
export const showError = (message, options) => dispatchToast("error", message, options);
export const showWarning = (message, options) => dispatchToast("warning", message, options);
export const showInfo = (message, options) => dispatchToast("info", message, options);
