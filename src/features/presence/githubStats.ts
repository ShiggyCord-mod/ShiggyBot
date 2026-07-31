import type { GitHubRepoStats, RepoApiResponse, ReleaseApiResponse } from '@dtypes/features';
import { logger } from '@logger/index.js';

const API_BASE = 'https://api.github.com';
const CACHE_TTL = 5 * 60 * 1000;

export class GitHubStatsService {
  private readonly repo: string;
  private readonly headers: Record<string, string>;
  private cache: { data: GitHubRepoStats; fetchedAt: number } | null = null;

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
    if (!force && this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL) {
      return this.cache.data;
    }

    try {
      const repoRes = await fetch(`${API_BASE}/repos/${this.repo}`, { headers: this.headers });
      if (!repoRes.ok) {
        logger.warn(`GitHub repo fetch failed: ${repoRes.status}`, { context: 'GitHubStats' });
        return this.cache?.data ?? null;
      }

      const repo = (await repoRes.json()) as RepoApiResponse;
      const [commits, latestRelease] = await Promise.all([
        this.fetchCommitCount(),
        this.fetchLatestRelease(),
      ]);

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

  private async fetchCommitCount(): Promise<number> {
    try {
      const res = await fetch(`${API_BASE}/repos/${this.repo}/commits?per_page=1`, {
        headers: this.headers,
      });
      if (!res.ok) return 0;

      const link = res.headers.get('link');
      if (!link) return 0;

      const lastMatch = /[?&]page=(\d+)[^>]*>; rel="last"/.exec(link);
      return lastMatch ? parseInt(lastMatch[1], 10) : 0;
    } catch {
      return 0;
    }
  }

  private async fetchLatestRelease(): Promise<string | null> {
    try {
      const res = await fetch(`${API_BASE}/repos/${this.repo}/releases/latest`, {
        headers: this.headers,
      });
      if (!res.ok) return null;

      const release = (await res.json()) as ReleaseApiResponse;
      return release.tag_name ?? null;
    } catch {
      return null;
    }
  }
}
