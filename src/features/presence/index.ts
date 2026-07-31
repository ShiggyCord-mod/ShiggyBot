import type { Client } from 'discord.js';
import { ActivityType } from 'discord.js';
import type { PresenceRotationOptions } from '@dtypes/features';
import { logger } from '@logger/index.js';
import { GitHubStatsService } from './githubStats.js';

export class PresenceFeature {
  private readonly client: Client;
  private readonly githubStats: GitHubStatsService;
  private readonly options: PresenceRotationOptions;
  private timer: ReturnType<typeof setInterval> | null = null;
  private index = 0;

  constructor(client: Client, options: PresenceRotationOptions) {
    this.client = client;
    this.options = options;
    this.githubStats = new GitHubStatsService(options.repoName);
  }

  async start(): Promise<void> {
    await this.update();
    this.timer = setInterval(() => void this.update(), this.options.intervalMs);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async update(): Promise<void> {
    if (!this.client.user) return;

    try {
      const stats = await this.githubStats.getStats();
      const activities = this.buildActivities(stats);

      if (activities.length > 0) {
        this.index = (this.index + 1) % activities.length;
        const activity = activities[this.index];

        this.client.user.setPresence({
          status: this.options.status,
          activities: [activity],
          afk: false,
        });
      }
    } catch (error) {
      logger.warn(`Presence update failed: ${(error as Error).message}`, { context: 'Presence' });
    }
  }

  private buildActivities(
    stats: Awaited<ReturnType<GitHubStatsService['getStats']>>
  ): Array<{ name: string; type: ActivityType }> {
    const base: Array<{ name: string; type: ActivityType }> = [];

    if (!stats) return base;

    const shortName = this.options.repoName.split('/').at(-1) ?? this.options.repoName;

    base.push(
      { name: `${stats.stars} ⭐ stars on ${shortName}`, type: ActivityType.Watching },
      { name: `${stats.forks} 🍴 forks on ${shortName}`, type: ActivityType.Watching },
      {
        name: `${stats.commits.toLocaleString()} commits in ${shortName}`,
        type: ActivityType.Watching,
      }
    );

    if (stats.latestRelease) {
      base.push({
        name: `${shortName} ${stats.latestRelease}`,
        type: ActivityType.Playing,
      });
    }

    return base;
  }
}
