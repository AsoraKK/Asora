import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const { getSetting, appConfigCtor } = vi.hoisted(() => {
  const getSetting = vi.fn<[], Promise<{ value?: string | null }>>();
  const appConfigCtor = vi.fn(() => ({
    getConfigurationSetting: getSetting,
  }));
  return { getSetting, appConfigCtor };
});

vi.mock("@azure/app-configuration", () => ({
  AppConfigurationClient: appConfigCtor,
}));

import { FeatureFlags } from "../pipeline/featureFlags";

describe("FeatureFlags", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    getSetting.mockReset();
    appConfigCtor.mockClear();
    process.env = { ...originalEnv };
    delete process.env.AZURE_APP_CONFIG_CONNECTION_STRING;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("returns numeric value from App Configuration when available", async () => {
    process.env.AZURE_APP_CONFIG_CONNECTION_STRING = "Endpoint=endpoint";
    getSetting.mockResolvedValueOnce({ value: "1.7" });

    const flags = new FeatureFlags();
    const value = await flags.getNumber("TEST_FLAG", 3);

    expect(appConfigCtor).toHaveBeenCalledTimes(1);
    expect(value).toBeCloseTo(1.7);
  });

  it("falls back to process env when App Config returns non-finite", async () => {
    process.env.AZURE_APP_CONFIG_CONNECTION_STRING = "Endpoint=endpoint";
    getSetting.mockResolvedValueOnce({ value: "NaN" });
    process.env.TEST_FLAG = "4.5";

    const flags = new FeatureFlags();
    const value = await flags.getNumber("TEST_FLAG", 3);

    expect(value).toBeCloseTo(4.5);
  });

  it("returns fallback when both sources fail", async () => {
    process.env.AZURE_APP_CONFIG_CONNECTION_STRING = "Endpoint=endpoint";
    getSetting.mockRejectedValueOnce(new Error("fail"));
    process.env.TEST_FLAG = "not-a-number";

    const flags = new FeatureFlags();
    const value = await flags.getNumber("TEST_FLAG", 7);

    expect(value).toBe(7);
  });

  it("parses JSON value from App Configuration", async () => {
    process.env.AZURE_APP_CONFIG_CONNECTION_STRING = "Endpoint=endpoint";
    getSetting.mockResolvedValueOnce({ value: '{"freshness": "fast"}' });

    const flags = new FeatureFlags();
    const value = await flags.getJSON<{ freshness: string }>("JSON_FLAG", { freshness: "slow" });

    expect(value).toEqual({ freshness: "fast" });
  });

  it("uses env JSON fallback and swallows parse errors", async () => {
    process.env.JSON_FLAG = '{"enabled":true}';
    const flagsWithEnv = new FeatureFlags();
    const envValue = await flagsWithEnv.getJSON("JSON_FLAG", { enabled: false });
    expect(envValue).toEqual({ enabled: true });

    process.env.JSON_FLAG = "{invalid";
    const fallback = await flagsWithEnv.getJSON("JSON_FLAG", { enabled: false });
    expect(fallback).toEqual({ enabled: false });
  });
});
