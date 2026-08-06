import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface RateLimitRule {
  limit: number;
  windowMs: number;
}

@Injectable()
export class IpRateLimitService {
  private readonly hits = new Map<string, number[]>();

  assertAllowed(key: string, rule: RateLimitRule): void {
    const now = Date.now();
    const windowStart = now - rule.windowMs;
    const recent = (this.hits.get(key) ?? []).filter(
      (timestamp) => timestamp > windowStart,
    );
    if (recent.length >= rule.limit) {
      throw new HttpException(
        'Too many requests',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.hits.set(key, recent);
  }
}
