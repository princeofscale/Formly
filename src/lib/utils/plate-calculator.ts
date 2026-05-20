const PLATE_SIZES = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5]

export interface PlateCount {
  weight: number
  count: number
}

export interface PlateBreakdown {
  plates: PlateCount[]
  /** Weight per side actually loaded (kg). May be slightly less than requested if not divisible. */
  loadedPerSide: number
  /** Leftover that couldn't be matched with available plates (kg). 0 if exact. */
  leftover: number
  /** True if the target weight is below the bar weight (or bar is heavier than target). */
  belowBar: boolean
}

export function calculatePlates(
  totalWeightKg: number,
  barWeightKg = 20,
): PlateBreakdown {
  const perSide = (totalWeightKg - barWeightKg) / 2
  if (perSide < 0) {
    return { plates: [], loadedPerSide: 0, leftover: 0, belowBar: true }
  }

  const result: PlateCount[] = []
  let remaining = perSide

  for (const plate of PLATE_SIZES) {
    const count = Math.floor(remaining / plate + 0.001)
    if (count > 0) {
      result.push({ weight: plate, count })
      remaining -= count * plate
      remaining = Math.round(remaining * 1000) / 1000
    }
  }

  return {
    plates: result,
    loadedPerSide: perSide - remaining,
    leftover: remaining,
    belowBar: false,
  }
}
