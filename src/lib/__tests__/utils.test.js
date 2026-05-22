import { describe, it, expect } from "vitest";
import { getMonthlyFee, isMissingLogoColumnError } from "../utils.js";

describe("getMonthlyFee", () => {
  it("returns category.monthlyFee when present", () => {
    expect(getMonthlyFee({ monthlyFee: 1500 }, 0)).toBe(1500);
  });

  it("falls back to category.monthly_fee (snake_case from DB)", () => {
    expect(getMonthlyFee({ monthly_fee: 1200 }, 0)).toBe(1200);
  });

  it("uses fallbackFee when category has no fee", () => {
    expect(getMonthlyFee({}, 800)).toBe(800);
  });

  it("uses fallbackFee when category is null", () => {
    expect(getMonthlyFee(null, 600)).toBe(600);
  });

  it("returns 0 when both category and fallback are absent", () => {
    expect(getMonthlyFee(null, null)).toBe(0);
  });

  it("prefers monthlyFee over monthly_fee", () => {
    expect(getMonthlyFee({ monthlyFee: 1000, monthly_fee: 500 }, 0)).toBe(1000);
  });
});

describe("isMissingLogoColumnError", () => {
  it("returns true when error mentions logo_url does not exist", () => {
    const error = { message: 'column "logo_url" does not exist' };
    expect(isMissingLogoColumnError(error)).toBe(true);
  });

  it("returns true when error mentions logo_url Could not find", () => {
    const error = { message: "Could not find column logo_url in schema" };
    expect(isMissingLogoColumnError(error)).toBe(true);
  });

  it("returns false for unrelated errors", () => {
    const error = { message: "column name does not exist" };
    expect(isMissingLogoColumnError(error)).toBe(false);
  });

  it("returns false for null error", () => {
    expect(isMissingLogoColumnError(null)).toBe(false);
  });
});
