import { PluginData, PluginResult, SearchOptions } from '@dtypes/commands';

const PLUGIN_DATA_URL =
  'https://raw.githubusercontent.com/Purple-EyeZ/Plugins-List/main/src/plugins-data.json';

let pluginCache: { data: PluginData[]; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000;

export function levenshteinDistance(a: string, b: string): number {
  const la = a.length;
  const lb = b.length;
  const dp: number[][] = Array.from({ length: la + 1 }, () => Array(lb + 1).fill(0));

  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;

  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }

  return dp[la][lb];
}

export function highlightMatch(text: string, query: string): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  const idx = lowerText.indexOf(lowerQuery);
  if (idx !== -1) {
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + query.length);
    const after = text.slice(idx + query.length);
    return `${before}__${match}__${after}`;
  }

  const queryWords = lowerQuery.split(/\s+/).filter((w) => w.length > 0);
  let result = text;
  let offset = 0;

  for (const word of queryWords) {
    const wordIdx = result.toLowerCase().indexOf(word, offset);
    if (wordIdx !== -1) {
      const before = result.slice(0, wordIdx);
      const match = result.slice(wordIdx, wordIdx + word.length);
      const after = result.slice(wordIdx + word.length);
      result = `${before}__${match}__${after}`;
      offset = wordIdx + word.length + 4;
    }
  }

  return result;
}

async function fetchPluginData(): Promise<PluginData[]> {
  if (!pluginCache || Date.now() - pluginCache.timestamp > CACHE_TTL) {
    try {
      const res = await fetch(PLUGIN_DATA_URL);
      if (res.ok) {
        const data = (await res.json()) as PluginData[];
        pluginCache = { data, timestamp: Date.now() };
      }
    } catch {
      // ignore
    }
  }

  return pluginCache?.data ?? [];
}

export async function searchPlugin(options: SearchOptions): Promise<PluginResult | null> {
  const { query, maxDistance = 5 } = options;
  const data = await fetchPluginData();

  if (data.length === 0) return null;

  const lowerQuery = query.toLowerCase();

  const exact = data.find((p) => p.name.toLowerCase() === lowerQuery);
  if (exact) return { data: exact, levenshteinDistance: 0 };

  const partial = data.find((p) => p.name.toLowerCase().includes(lowerQuery));
  if (partial) {
    const distance = levenshteinDistance(lowerQuery, partial.name.toLowerCase());
    return { data: partial, levenshteinDistance: distance };
  }

  let bestMatch: PluginResult | null = null;
  let bestDistance = Infinity;

  for (const plugin of data) {
    const distance = levenshteinDistance(lowerQuery, plugin.name.toLowerCase());
    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = { data: plugin, levenshteinDistance: distance };
    }
  }

  if (bestMatch && bestDistance <= maxDistance) return bestMatch;

  return null;
}
