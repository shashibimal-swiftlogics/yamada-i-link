// Browser-local storage for the DEMO only. Real deployment will use Supabase with server-side
// authorization. Every read is wrapped so a blocked or corrupt storage area never crashes the page.
export const KEYS = {
  orders: 'yamada-sample-orders-v1',
  masterCurrent: 'yamada-master-csv-v1',
  masterPrevious: 'yamada-master-csv-prev-v1',
  profiles: 'yamada-shop-profiles-v1',
};

export function readJson(key, fallback) {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  if (typeof localStorage === 'undefined') throw new Error('このブラウザには保存できません。');
  localStorage.setItem(key, JSON.stringify(value));
}
