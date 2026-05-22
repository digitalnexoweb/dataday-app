import { describe, it, expect } from "vitest";
import { getChargeablePeriods, getCurrentFeeStatus } from "../format.js";

// ---------------------------------------------------------------------------
// getChargeablePeriods
// ---------------------------------------------------------------------------

describe("getChargeablePeriods", () => {
  it("returns empty array when enrollment is in the future", () => {
    const member = { enrollmentDate: "2099-01-01" };
    const result = getChargeablePeriods(member, { now: "2026-05-22" });
    expect(result).toEqual([]);
  });

  it("returns no periods when enrolled this month and still within dueDay", () => {
    // today = 5th, dueDay = 10 → lastChargeableMonth = currentMonth - 1 = April
    // enrolled May → no periods chargeable yet
    const member = { enrollmentDate: "2026-05-01" };
    const result = getChargeablePeriods(member, { now: "2026-05-05", dueDay: 10 });
    expect(result).toEqual([]);
  });

  it("returns current month when past dueDay", () => {
    // today = 15th, dueDay = 10 → lastChargeableMonth = May
    // enrolled Jan → Jan, Feb, Mar, Apr, May
    const member = { enrollmentDate: "2026-01-01" };
    const result = getChargeablePeriods(member, { now: "2026-05-15", dueDay: 10 });
    expect(result).toEqual([
      { month: 1, year: 2026 },
      { month: 2, year: 2026 },
      { month: 3, year: 2026 },
      { month: 4, year: 2026 },
      { month: 5, year: 2026 },
    ]);
  });

  it("spans multiple years correctly", () => {
    const member = { enrollmentDate: "2025-11-01" };
    // today = 2026-02-15, dueDay = 10 → lastChargeableMonth = Feb 2026
    const result = getChargeablePeriods(member, { now: "2026-02-15", dueDay: 10 });
    expect(result).toEqual([
      { month: 11, year: 2025 },
      { month: 12, year: 2025 },
      { month: 1, year: 2026 },
      { month: 2, year: 2026 },
    ]);
  });

  it("returns empty when no enrollmentDate and today is exactly dueDay", () => {
    // No enrollment date → defaults enrollmentYear/Month to current year/1
    // today = Jan 10, dueDay = 10 → lastChargeableMonth = Jan - 1 = 0 → no periods
    const member = {};
    const result = getChargeablePeriods(member, { now: "2026-01-10", dueDay: 10 });
    expect(result).toEqual([]);
  });

  it("uses dueDay=10 by default", () => {
    const member = { enrollmentDate: "2026-04-01" };
    // today = May 5 (≤ 10) → lastChargeableMonth = Apr
    const result = getChargeablePeriods(member, { now: "2026-05-05" });
    expect(result).toEqual([{ month: 4, year: 2026 }]);
  });
});

// ---------------------------------------------------------------------------
// getCurrentFeeStatus
// ---------------------------------------------------------------------------

describe("getCurrentFeeStatus", () => {
  const memberId = 1;
  const member = { id: memberId, enrollmentDate: "2026-01-01" };

  function payment(month, year) {
    return { memberId, month, year };
  }

  it("returns 'current' when all chargeable periods are paid", () => {
    // today = May 5, dueDay = 10 → lastChargeableMonth = Apr
    // enrolled Jan → need Jan, Feb, Mar, Apr paid
    const payments = [payment(1, 2026), payment(2, 2026), payment(3, 2026), payment(4, 2026)];
    const status = getCurrentFeeStatus(member, payments, { now: "2026-05-05", dueDay: 10 });
    expect(status).toBe("current");
  });

  it("returns 'pending' when unpaid periods exist but within dueDay grace", () => {
    // today = May 5, dueDay = 10, missing April
    const payments = [payment(1, 2026), payment(2, 2026), payment(3, 2026)];
    const status = getCurrentFeeStatus(member, payments, { now: "2026-05-05", dueDay: 10 });
    expect(status).toBe("pending");
  });

  it("returns 'late' when unpaid periods exist and past dueDay", () => {
    // today = May 15, past dueDay=10
    const payments = [payment(1, 2026), payment(2, 2026), payment(3, 2026)];
    const status = getCurrentFeeStatus(member, payments, { now: "2026-05-15", dueDay: 10 });
    expect(status).toBe("late");
  });

  it("returns 'current' with no payments when no chargeable periods yet", () => {
    // enrolled today, still within dueDay → no chargeable periods
    const newMember = { id: 2, enrollmentDate: "2026-05-01" };
    const status = getCurrentFeeStatus(newMember, [], { now: "2026-05-05", dueDay: 10 });
    expect(status).toBe("current");
  });

  it("ignores payments from other members", () => {
    // Payment belongs to member 99, not member 1
    const payments = [{ memberId: 99, month: 1, year: 2026 }];
    const status = getCurrentFeeStatus(member, payments, { now: "2026-05-05", dueDay: 10 });
    expect(status).toBe("pending");
  });

  it("handles multi-year debt as 'late'", () => {
    const oldMember = { id: 3, enrollmentDate: "2024-01-01" };
    const status = getCurrentFeeStatus(oldMember, [], { now: "2026-05-15", dueDay: 10 });
    expect(status).toBe("late");
  });
});
