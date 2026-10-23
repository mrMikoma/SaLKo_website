import { describe, expect, test } from "bun:test";
import { clientIp, RateLimiter, waitText } from "@/utilities/rateLimit";

const MINUTE = 60_000;

describe("the rate limiter", () => {
  test("blocks a key at the limit within the window, for the block time", () => {
    const limiter = new RateLimiter("test-block", 3, 15 * MINUTE, 10 * MINUTE);
    const t = 1_000_000;
    limiter.hit("a", t);
    limiter.hit("a", t + MINUTE);
    expect(limiter.blockedFor("a", t + MINUTE)).toBe(0);
    limiter.hit("a", t + 2 * MINUTE);
    expect(limiter.blockedFor("a", t + 2 * MINUTE)).toBe(10 * MINUTE);
    expect(limiter.blockedFor("a", t + 11 * MINUTE)).toBe(MINUTE);
    expect(limiter.blockedFor("a", t + 12 * MINUTE)).toBe(0);
    // Other keys are counted on their own
    expect(limiter.blockedFor("b", t + 2 * MINUTE)).toBe(0);
  });

  test("forgets events older than the window", () => {
    const limiter = new RateLimiter("test-window", 3, MINUTE, MINUTE);
    const t = 5_000_000;
    limiter.hit("a", t);
    limiter.hit("a", t + 10_000);
    limiter.hit("a", t + 2 * MINUTE);
    expect(limiter.blockedFor("a", t + 2 * MINUTE)).toBe(0);
  });

  test("starts over after a reset, and after a block ends", () => {
    const limiter = new RateLimiter("test-reset", 2, MINUTE, MINUTE);
    const t = 9_000_000;
    limiter.hit("a", t);
    limiter.reset("a");
    limiter.hit("a", t + 1);
    expect(limiter.blockedFor("a", t + 1)).toBe(0);
    limiter.hit("a", t + 2);
    expect(limiter.blockedFor("a", t + 2)).toBeGreaterThan(0);
    limiter.hit("a", t + 2 * MINUTE);
    expect(limiter.blockedFor("a", t + 2 * MINUTE)).toBe(0);
  });

  test("two limiters with the same name share their counts, as two copies of the module would", () => {
    const one = new RateLimiter("test-shared", 2, MINUTE, MINUTE);
    const two = new RateLimiter("test-shared", 2, MINUTE, MINUTE);
    one.hit("a", 1);
    two.hit("a", 2);
    expect(one.blockedFor("a", 2)).toBeGreaterThan(0);
  });
});

describe("the visitor's address", () => {
  test("comes from Cloudflare's header first, then X-Forwarded-For", () => {
    expect(clientIp(new Headers({ "cf-connecting-ip": "203.0.113.5", "x-forwarded-for": "10.0.0.1" }))).toBe(
      "203.0.113.5"
    );
    expect(clientIp(new Headers({ "x-forwarded-for": "198.51.100.7, 10.0.0.1" }))).toBe("198.51.100.7");
    expect(clientIp(new Headers())).toBe("unknown");
  });

  test("the wait is said in whole minutes, rounded up", () => {
    expect(waitText(15 * MINUTE)).toBe("15 minuutin");
    expect(waitText(61_000)).toBe("2 minuutin");
    expect(waitText(0)).toBe("1 minuutin");
  });
});
