import { calculatePlates } from '@/lib/utils/plate-calculator'

interface Props {
  weightKg: number
  barWeightKg?: number
}

const PLATE_COLORS: Record<number, string> = {
  25: 'bg-red-600', 20: 'bg-blue-600', 15: 'bg-yellow-500',
  10: 'bg-green-600', 5: 'bg-zinc-400', 2.5: 'bg-zinc-300', 1.25: 'bg-zinc-200',
}

export function PlateCalculator({ weightKg, barWeightKg = 20 }: Props) {
  const plates = calculatePlates(weightKg, barWeightKg)

  return (
    <div className="mt-2 p-3 bg-white/5 rounded-lg">
      <p className="text-xs text-zinc-400 mb-2">Plates per side ({barWeightKg}kg bar):</p>
      {plates.length === 0 ? (
        <p className="text-xs text-zinc-500">Bar only</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {plates.map((p, i) => (
            <div key={i} className={`${PLATE_COLORS[p.weight] ?? 'bg-zinc-600'} text-white text-xs font-bold px-2 py-1 rounded`}>
              {p.count}×{p.weight}kg
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
