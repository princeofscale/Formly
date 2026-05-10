const PLATE_SIZES = [25, 20, 15, 10, 5, 2.5, 1.25]

export interface PlateCount {
  weight: number
  count: number
}

export function calculatePlates(totalWeightKg: number, barWeightKg = 20): PlateCount[] {
  const perSide = (totalWeightKg - barWeightKg) / 2
  if (perSide <= 0) return []

  const result: PlateCount[] = []
  let remaining = perSide

  for (const plate of PLATE_SIZES) {
    const count = Math.floor(remaining / plate + 0.001) // floating point tolerance
    if (count > 0) {
      result.push({ weight: plate, count })
      remaining -= count * plate
      remaining = Math.round(remaining * 100) / 100
    }
  }

  return result
}
