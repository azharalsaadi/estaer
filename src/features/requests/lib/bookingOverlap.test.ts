import { describe, expect, it } from "vitest"
import { doesRangeCrossBooking, isDateBooked, rangesOverlap } from "./bookingOverlap"

// The exact worked example from the request: an item booked Nov 9–11
// (inclusive) must block Nov 11 but accept Nov 12 onward.
const BOOKED = [{ start_date: "2026-11-09", end_date: "2026-11-11" }]

describe("isDateBooked", () => {
  it("is booked on every day within the inclusive range, including both ends", () => {
    expect(isDateBooked("2026-11-09", BOOKED)).toBe(true)
    expect(isDateBooked("2026-11-10", BOOKED)).toBe(true)
    expect(isDateBooked("2026-11-11", BOOKED)).toBe(true)
  })

  it("is free the day before the range starts", () => {
    expect(isDateBooked("2026-11-08", BOOKED)).toBe(false)
  })

  it("is free the day after the range ends — the reported example", () => {
    expect(isDateBooked("2026-11-12", BOOKED)).toBe(false)
  })

  it("is free when there are no booked ranges at all", () => {
    expect(isDateBooked("2026-11-10", [])).toBe(false)
  })
})

describe("rangesOverlap", () => {
  it("overlaps when one range's start falls inside the other", () => {
    expect(rangesOverlap("2026-11-10", "2026-11-13", "2026-11-09", "2026-11-11")).toBe(
      true
    )
  })

  it("overlaps when ranges are identical", () => {
    expect(rangesOverlap("2026-11-09", "2026-11-11", "2026-11-09", "2026-11-11")).toBe(
      true
    )
  })

  it("does not overlap when one range ends exactly the day before the other starts", () => {
    expect(rangesOverlap("2026-11-12", "2026-11-14", "2026-11-09", "2026-11-11")).toBe(
      false
    )
  })

  it("does not overlap when far apart", () => {
    expect(rangesOverlap("2026-12-01", "2026-12-05", "2026-11-09", "2026-11-11")).toBe(
      false
    )
  })
})

describe("doesRangeCrossBooking", () => {
  it("rejects a range starting on the booking's last day — Nov 11 conflicts", () => {
    expect(doesRangeCrossBooking("2026-11-11", "2026-11-13", BOOKED)).toBe(true)
  })

  it("rejects a range that merely passes through a booked day, even if neither end is booked", () => {
    expect(doesRangeCrossBooking("2026-11-08", "2026-11-12", BOOKED)).toBe(true)
  })

  it("accepts a range starting the day after the booking ends — Nov 12 is accepted", () => {
    expect(doesRangeCrossBooking("2026-11-12", "2026-11-14", BOOKED)).toBe(false)
  })

  it("accepts a range entirely before the booking", () => {
    expect(doesRangeCrossBooking("2026-11-01", "2026-11-08", BOOKED)).toBe(false)
  })
})

// The user's own verification example: an item booked Nov 19–20.
describe("Nov 19-20 booking — the exact scenario reported as a mismatch", () => {
  const booked = [{ start_date: "2026-11-19", end_date: "2026-11-20" }]

  it("both booked days are individually flagged", () => {
    expect(isDateBooked("2026-11-19", booked)).toBe(true)
    expect(isDateBooked("2026-11-20", booked)).toBe(true)
  })

  it("Nov 18-22 is rejected — it crosses both booked days", () => {
    expect(doesRangeCrossBooking("2026-11-18", "2026-11-22", booked)).toBe(true)
  })

  it("Nov 21 is available — the day right after the booking ends, not padded by a return-due day", () => {
    expect(isDateBooked("2026-11-21", booked)).toBe(false)
    expect(doesRangeCrossBooking("2026-11-21", "2026-11-23", booked)).toBe(false)
  })
})
