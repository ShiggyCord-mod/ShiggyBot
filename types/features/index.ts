import type { PresenceStatusData } from 'discord.js';

export interface PresenceRotationOptions {
  status: PresenceStatusData;
  intervalMs: number;
  repoName: string;
  githubToken?: string;
}

export interface GitHubRepoStats {
  stars: number;
  forks: number;
  watchers: number;
  openIssues: number;
  commits: number;
  latestRelease: string | null;
  language: string | null;
  url: string;
}

export interface RepoApiResponse {
  stargazers_count?: number;
  forks_count?: number;
  watchers_count?: number;
  open_issues_count?: number;
  language?: string | null;
  html_url?: string;
}

export interface ReleaseApiResponse {
  tag_name?: string;
  html_url?: string;
}
