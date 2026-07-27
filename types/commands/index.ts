export interface PluginData {
  name: string;
  description: string;
  authors: string[];
  status: string;
  sourceUrl: string;
  installUrl: string;
  warningMessage?: string;
}

export interface PluginResult {
  data: PluginData;
  levenshteinDistance: number;
}

export interface SearchOptions {
  query: string;
  maxDistance?: number;
}
