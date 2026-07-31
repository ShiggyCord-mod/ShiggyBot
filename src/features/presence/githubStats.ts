import type { GitHubRepoStats, RepoApiResponse, ReleaseApiResponse } from '@dtypes/features';
import { logger } from '@logger/index.js';

const API_BASE = 'https://api.github.com';
const CACHE_TTL = 30 * 60 * 1000;
const MIN_BACKOFF_MS = 60 * 1000;
const AUX_REQUESTS = 2;
const REQUEST_TIMEOUT_MS = 10 * 1000;

export class GitHubStatsService {
  private readonly repo: string;
  private readonly headers: Record<string, string>;
  private cache: { data: GitHubRepoStats; fetchedAt: number } | null = null;
  private rateLimitedUntil = 0;
  private pending: Promise<GitHubRepoStats | null> | null = null;

  constructor(repo: string, token?: string) {
    this.repo = repo;
    this.headers = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'ShiggyBot',
    };
    if (token) {
      this.headers.Authorization = `Bearer ${token}`;
    }
  }

  async getStats(force = false): Promise<GitHubRepoStats | null> {
    if (this.rateLimitedUntil > Date.now()) {
      return this.cache?.data ?? null;
    }

    if (!force && this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL) {
      return this.cache.data;
    }

    this.pending ??= this.fetchStats();
    try {
      return await this.pending;
    } finally {
      this.pending = null;
    }
  }

  private async fetchStats(): Promise<GitHubRepoStats | null> {
    try {
      const repoRes = await this.fetch(`${API_BASE}/repos/${this.repo}`);
      if (this.isRateLimited(repoRes)) {
        this.applyRateLimitBackoff(repoRes);
        return this.cache?.data ?? null;
      }
      if (!repoRes.ok) {
        logger.warn(`GitHub repo fetch failed: ${repoRes.status}`, { context: 'GitHubStats' });
        return this.cache?.data ?? null;
      }

      const repo = (await repoRes.json()) as RepoApiResponse;
      const [commits, latestRelease] = await this.fetchAuxData(repoRes);

      const stats: GitHubRepoStats = {
        stars: repo.stargazers_count ?? 0,
        forks: repo.forks_count ?? 0,
        watchers: repo.watchers_count ?? 0,
        openIssues: repo.open_issues_count ?? 0,
        commits,
        latestRelease,
        language: repo.language ?? null,
        url: repo.html_url ?? `https://github.com/${this.repo}`,
      };

      this.cache = { data: stats, fetchedAt: Date.now() };
      return stats;
    } catch (error) {
      logger.warn(`GitHub stats fetch failed: ${(error as Error).message}`, {
        context: 'GitHubStats',
      });
      return this.cache?.data ?? null;
    }
  }

  private async fetchAuxData(repoRes: Response): Promise<[number, string | null]> {
    const remaining = Number.parseInt(repoRes.headers.get('x-ratelimit-remaining') ?? '', 10);
    if (Number.isFinite(remaining) && remaining < AUX_REQUESTS) {
      logger.warn(`GitHub rate limit budget low (${remaining} remaining), reusing cached data`, {
        context: 'GitHubStats',
      });
      return [this.cache?.data.commits ?? 0, this.cache?.data.latestRelease ?? null];
    }

    return Promise.all([this.fetchCommitCount(), this.fetchLatestRelease()]);
  }

  private async fetchCommitCount(): Promise<number> {
    try {
      const res = await this.fetch(`${API_BASE}/repos/${this.repo}/commits?per_page=1`);
      if (!res.ok) return 0;

      const link = res.headers.get('link');
      if (!link) return 0;

      const lastMatch = /[?&]page=(\d+)[^>]*>; rel="last"/.exec(link);
      return lastMatch ? Number.parseInt(lastMatch[1], 10) : 0;
    } catch {
      return 0;
    }
  }

  private async fetchLatestRelease(): Promise<string | null> {
    try {
      const res = await this.fetch(`${API_BASE}/repos/${this.repo}/releases/latest`);
      if (!res.ok) return null;

      const release = (await res.json()) as ReleaseApiResponse;
      return release.tag_name ?? null;
    } catch {
      return null;
    }
  }

  private async fetch(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { headers: this.headers, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }

  private isRateLimited(res: Response): boolean {
    return res.status === 429 || res.headers.get('x-ratelimit-remaining') === '0';
  }

  private applyRateLimitBackoff(res: Response): void {
    const now = Date.now();
    const retryAfter = res.headers.get('retry-after');
    const reset = res.headers.get('x-ratelimit-reset');

    let waitMs = MIN_BACKOFF_MS;
    if (retryAfter) {
      const seconds = Number.parseInt(retryAfter, 10);
      if (Number.isFinite(seconds)) waitMs = seconds * 1000;
    } else if (reset) {
      const resetAt = Number.parseInt(reset, 10) * 1000;
      if (Number.isFinite(resetAt)) waitMs = resetAt - now + 1000;
    }

    this.rateLimitedUntil = now + Math.max(waitMs, MIN_BACKOFF_MS);
    logger.warn(
      `GitHub rate limited, backing off for ${Math.round((this.rateLimitedUntil - now) / 1000)}s`,
      { context: 'GitHubStats' }
    );
  }
}
