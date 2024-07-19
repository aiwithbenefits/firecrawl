import {
  getRateLimiter,
  TestSuiteRateLimiter,
  ServerRateLimiter,
  connectRateLimitRedisClient,
  disconnectRateLimitRedisClient
} from "./rate-limiter";
import { RateLimiterMode } from "../../src/types";

describe("Rate Limiter Service", () => {
  beforeAll(async () => {
    try {
      if (
        !ServerRateLimiter.getRedisClient() ||
        (ServerRateLimiter.getRedisClient().status !== "connecting" &&
          ServerRateLimiter.getRedisClient().status !== "ready")
      ) {
        await connectRateLimitRedisClient();
      }

      // wait for the redis client to be ready
      await new Promise((resolve, reject) => {
        ServerRateLimiter.getRedisClient().on("ready", resolve);
        ServerRateLimiter.getRedisClient().on("error", reject);
      });
    } catch (error) {
      console.error("Failed to connect Redis client:", error);
      throw error;
    }
  });

  afterAll(async () => {
    try {
      disconnectRateLimitRedisClient();
    } catch (error) {}
  });

  it("should return the testSuiteRateLimiter for specific tokens", () => {
    const limiter = getRateLimiter(
      "crawl" as RateLimiterMode,
      "test-prefix:a01ccae"
    );
    expect(limiter).toBe(TestSuiteRateLimiter.getInstance());

    const limiter2 = getRateLimiter(
      "scrape" as RateLimiterMode,
      "test-prefix:6254cf9"
    );
    expect(limiter2).toBe(TestSuiteRateLimiter.getInstance());
  });

  it("should return the serverRateLimiter if mode is not found", () => {
    const limiter = getRateLimiter(
      "nonexistent" as RateLimiterMode,
      "test-prefix:someToken"
    );
    expect(limiter).toBe(ServerRateLimiter.getInstance());
  });

  it("should return the correct rate limiter based on mode and plan", () => {
    const limiter = getRateLimiter(
      "crawl" as RateLimiterMode,
      "test-prefix:someToken",
      "free"
    );
    expect(limiter.points).toBe(2);

    const limiter2 = getRateLimiter(
      "scrape" as RateLimiterMode,
      "test-prefix:someToken",
      "standard"
    );

    // console.log({ limiter2 })

    expect(limiter2.points).toBe(50);

    const limiter3 = getRateLimiter(
      "search" as RateLimiterMode,
      "test-prefix:someToken",
      "growth"
    );
    expect(limiter3.points).toBe(500);

    const limiter4 = getRateLimiter(
      "crawlStatus" as RateLimiterMode,
      "test-prefix:someToken",
      "growth"
    );
    expect(limiter4.points).toBe(150);
  });

  it("should return the default rate limiter if plan is not provided", () => {
    const limiter = getRateLimiter(
      "crawl" as RateLimiterMode,
      "test-prefix:someToken"
    );
    expect(limiter.points).toBe(3);

    const limiter2 = getRateLimiter(
      "scrape" as RateLimiterMode,
      "test-prefix:someToken"
    );
    expect(limiter2.points).toBe(20);
  });

  it("should return the correct rate limiter for 'preview' mode", () => {
    const limiter = getRateLimiter(
      "preview" as RateLimiterMode,
      "test-prefix:someToken",
      "free"
    );
    expect(limiter.points).toBe(5);

    const limiter2 = getRateLimiter(
      "preview" as RateLimiterMode,
      "test-prefix:someToken"
    );
    expect(limiter2.points).toBe(5);
  });

  it("should return the correct rate limiter for 'account' mode", () => {
    const limiter = getRateLimiter(
      "account" as RateLimiterMode,
      "test-prefix:someToken",
      "free"
    );
    expect(limiter.points).toBe(100);

    const limiter2 = getRateLimiter(
      "account" as RateLimiterMode,
      "test-prefix:someToken"
    );
    expect(limiter2.points).toBe(100);
  });

  it("should return the correct rate limiter for 'crawlStatus' mode", () => {
    const limiter = getRateLimiter(
      "crawlStatus" as RateLimiterMode,
      "test-prefix:someToken",
      "free"
    );
    expect(limiter.points).toBe(150);

    const limiter2 = getRateLimiter(
      "crawlStatus" as RateLimiterMode,
      "test-prefix:someToken"
    );
    expect(limiter2.points).toBe(150);
  });

  it("should consume points correctly for 'crawl' mode", async () => {
    const limiter = getRateLimiter(
      "crawl" as RateLimiterMode,
      "test-prefix:someTokenCRAWL",
      "free"
    );
    const consumePoints = 1;

    const res = await limiter.consume(
      "test-prefix:someTokenCRAWL",
      consumePoints
    );
    expect(res.remainingPoints).toBe(1);
  });

  it("should consume points correctly for 'scrape' mode (DEFAULT)", async () => {
    const limiter = getRateLimiter(
      "scrape" as RateLimiterMode,
      "test-prefix:someTokenX"
    );
    const consumePoints = 4;

    const res = await limiter.consume("test-prefix:someTokenX", consumePoints);
    expect(res.remainingPoints).toBe(16);
  });

  it("should consume points correctly for 'scrape' mode (HOBBY)", async () => {
    const limiter = getRateLimiter(
      "scrape" as RateLimiterMode,
      "test-prefix:someTokenXY",
      "hobby"
    );
    // expect hobby to have 100 points
    expect(limiter.points).toBe(10);

    const consumePoints = 5;

    const res = await limiter.consume("test-prefix:someTokenXY", consumePoints);
    expect(res.consumedPoints).toBe(5);
    expect(res.remainingPoints).toBe(5);
  });

  it("should return the correct rate limiter for 'crawl' mode", () => {
    const limiter = getRateLimiter(
      "crawl" as RateLimiterMode,
      "test-prefix:someToken",
      "free"
    );
    expect(limiter.points).toBe(2);

    const limiter2 = getRateLimiter(
      "crawl" as RateLimiterMode,
      "test-prefix:someToken",
      "starter"
    );
    expect(limiter2.points).toBe(3);

    const limiter3 = getRateLimiter(
      "crawl" as RateLimiterMode,
      "test-prefix:someToken",
      "standard"
    );
    expect(limiter3.points).toBe(5);
  });

  it("should return the correct rate limiter for 'scrape' mode", () => {
    const limiter = getRateLimiter(
      "scrape" as RateLimiterMode,
      "test-prefix:someToken",
      "free"
    );
    expect(limiter.points).toBe(5);

    const limiter2 = getRateLimiter(
      "scrape" as RateLimiterMode,
      "test-prefix:someToken",
      "starter"
    );
    expect(limiter2.points).toBe(20);

    const limiter3 = getRateLimiter(
      "scrape" as RateLimiterMode,
      "test-prefix:someToken",
      "standard"
    );
    expect(limiter3.points).toBe(50);
  });

  it("should return the correct rate limiter for 'search' mode", () => {
    const limiter = getRateLimiter(
      "search" as RateLimiterMode,
      "test-prefix:someToken",
      "free"
    );
    expect(limiter.points).toBe(5);

    const limiter2 = getRateLimiter(
      "search" as RateLimiterMode,
      "test-prefix:someToken",
      "starter"
    );
    expect(limiter2.points).toBe(20);

    const limiter3 = getRateLimiter(
      "search" as RateLimiterMode,
      "test-prefix:someToken",
      "standard"
    );
    expect(limiter3.points).toBe(40);
  });

  it("should return the correct rate limiter for 'preview' mode", () => {
    const limiter = getRateLimiter(
      "preview" as RateLimiterMode,
      "test-prefix:someToken",
      "free"
    );
    expect(limiter.points).toBe(5);

    const limiter2 = getRateLimiter(
      "preview" as RateLimiterMode,
      "test-prefix:someToken"
    );
    expect(limiter2.points).toBe(5);
  });

  it("should return the correct rate limiter for 'account' mode", () => {
    const limiter = getRateLimiter(
      "account" as RateLimiterMode,
      "test-prefix:someToken",
      "free"
    );
    expect(limiter.points).toBe(100);

    const limiter2 = getRateLimiter(
      "account" as RateLimiterMode,
      "test-prefix:someToken"
    );
    expect(limiter2.points).toBe(100);
  });

  it("should return the correct rate limiter for 'crawlStatus' mode", () => {
    const limiter = getRateLimiter(
      "crawlStatus" as RateLimiterMode,
      "test-prefix:someToken",
      "free"
    );
    expect(limiter.points).toBe(150);

    const limiter2 = getRateLimiter(
      "crawlStatus" as RateLimiterMode,
      "test-prefix:someToken"
    );
    expect(limiter2.points).toBe(150);
  });

  it("should return the correct rate limiter for 'testSuite' mode", () => {
    const limiter = getRateLimiter(
      "testSuite" as RateLimiterMode,
      "test-prefix:someToken",
      "free"
    );
    expect(limiter.points).toBe(10000);

    const limiter2 = getRateLimiter(
      "testSuite" as RateLimiterMode,
      "test-prefix:someToken"
    );
    expect(limiter2.points).toBe(10000);
  });

  it("should throw an error when consuming more points than available", async () => {
    const limiter = getRateLimiter(
      "crawl" as RateLimiterMode,
      "test-prefix:someToken"
    );
    const consumePoints = limiter.points + 1;

    try {
      await limiter.consume("test-prefix:someToken", consumePoints);
    } catch (error) {
      // expect remaining points to be 0
      const res = await limiter.get("test-prefix:someToken");
      expect(res.remainingPoints).toBe(0);
    }
  });

  it("should reset points after duration", async () => {
    const keyPrefix = "test-prefix";
    const points = 10;
    const duration = 1; // 1 second
    const limiter = getRateLimiter(
      "crawl" as RateLimiterMode,
      "test-prefix:someToken",
      "free"
    );

    const consumePoints = 5;
    await limiter.consume("test-prefix:someToken", consumePoints);
    await new Promise((resolve) => setTimeout(resolve, duration * 1000 + 100)); // Wait for duration + 100ms

    const res = await limiter.consume("test-prefix:someToken", consumePoints);
    expect(res.remainingPoints).toBe(points - consumePoints);
  });
});