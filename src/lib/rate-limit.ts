interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const stores = new Map<string, Map<string, RateLimitEntry>>();

// 期限切れエントリを5分ごとに削除してメモリリークを防ぐ
setInterval(() => {
  const now = Date.now();
  for (const store of stores.values()) {
    for (const [key, entry] of store.entries()) {
      if (now > entry.resetAt) {
        store.delete(key);
      }
    }
  }
}, 5 * 60 * 1000);

/**
 * シンプルなインメモリレートリミッター。
 * @param limiterId  リミッターの識別子（例: "image-gen"）
 * @param key        ユーザーIDやIPアドレスなどのキー
 * @param maxRequests ウィンドウ内の最大リクエスト数
 * @param windowMs   ウィンドウのミリ秒
 * @returns true = 許可, false = 超過
 */
export function checkRateLimit(
  limiterId: string,
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  if (!stores.has(limiterId)) stores.set(limiterId, new Map());
  const store = stores.get(limiterId)!;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}
