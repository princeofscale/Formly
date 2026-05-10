export function calculateBMI(weightKg: number, heightCm: number): number {
  if (heightCm <= 0 || weightKg <= 0) throw new Error('Height and weight must be positive')
  const heightM = heightCm / 100
  return weightKg / (heightM * heightM)
}

export function bmiCategory(bmi: number): 'Underweight' | 'Normal' | 'Overweight' | 'Obese' {
  if (bmi < 18.5) return 'Underweight'
  if (bmi < 25) return 'Normal'
  if (bmi < 30) return 'Overweight'
  return 'Obese'
}
