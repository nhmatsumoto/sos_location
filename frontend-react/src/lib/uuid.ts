const fallbackUuid = () => {
  const randomHex = () => Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
  const timestampHex = Date.now().toString(16);
  return `${timestampHex}-${randomHex()}-${randomHex()}`;
};

export const generateUuid = () => {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return fallbackUuid();
};
