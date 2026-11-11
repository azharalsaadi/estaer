import { describe, expect, it } from "vitest"
import { getReturnDueDate, isOnLoan, isOverdue, isoToLocalDate, localDateToIso } from "./dates"

// The exact worked example from the approved plan (REQUIREMENTS.md §15):
// Start Nov 10, last day of use Nov 12 -> return due Nov 13 -> overdue
// begins Nov 14 at 00:00 (not Nov 13, the return-due day itself).
describe("getReturnDueDate", () => {
  it("is the calendar day after the last day of use", () => {
    expect(getReturnDueDate("2026-11-12")).toBe("2026-11-13")
  })

  it("handles a month boundary", () => {
    expect(getReturnDueDate("2026-11-30")).toBe("2026-12-01")
  })

  it("handles same-day start and end (inclusive last day)", () => {
    expect(getReturnDueDate("2026-11-10")).toBe("2026-11-11")
  })
})

describe("isOverdue", () => {
  const endDate = "2026-11-12" // return due 2026-11-13

  it("is NOT overdue on the return due date itself — the employee has the whole day", () => {
    expect(isOverdue("approved", endDate, "2026-11-13")).toBe(false)
  })

  it("becomes overdue at the start of the day AFTER the return due date", () => {
    expect(isOverdue("approved", endDate, "2026-11-14")).toBe(true)
  })

  it("stays overdue on later days until returned", () => {
    expect(isOverdue("approved", endDate, "2026-12-01")).toBe(true)
  })

  it("is never overdue while only pending (not yet approved)", () => {
    expect(isOverdue("pending", endDate, "2026-12-01")).toBe(false)
  })

  it("is never overdue once returned", () => {
    expect(isOverdue("returned", endDate, "2026-12-01")).toBe(false)
  })

  it("is never overdue once rejected", () => {
    expect(isOverdue("rejected", endDate, "2026-12-01")).toBe(false)
  })
})

describe("isOnLoan", () => {
  const startDate = "2026-11-10"

  it("is not on loan before the start date even if approved (approval is not handover)", () => {
    expect(isOnLoan("approved", startDate, "2026-11-09")).toBe(false)
  })

  it("is on loan once the start date arrives", () => {
    expect(isOnLoan("approved", startDate, "2026-11-10")).toBe(true)
  })

  it("stays on loan after the start date", () => {
    expect(isOnLoan("approved", startDate, "2026-11-20")).toBe(true)
  })

  it("is never on loan while only pending", () => {
    expect(isOnLoan("pending", startDate, "2026-11-20")).toBe(false)
  })
})

describe("isoToLocalDate / localDateToIso", () => {
  it("round-trips without drifting a day, regardless of local timezone", () => {
    const iso = "2026-11-09"
    expect(localDateToIso(isoToLocalDate(iso))).toBe(iso)
  })

  it("round-trips a month boundary", () => {
    const iso = "2026-11-30"
    expect(localDateToIso(isoToLocalDate(iso))).toBe(iso)
  })

  it("round-trips a year boundary", () => {
    const iso = "2026-12-31"
    expect(localDateToIso(isoToLocalDate(iso))).toBe(iso)
  })

  it("isoToLocalDate produces the exact calendar date, not a UTC-shifted one", () => {
    const date = isoToLocalDate("2026-11-09")
    expect(date.getFullYear()).toBe(2026)
    expect(date.getMonth()).toBe(10) // 0-indexed
    expect(date.getDate()).toBe(9)
  })
})
