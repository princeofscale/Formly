# 3D-манекен в Muscle Heatmap — design

**Date:** 2026-05-24
**Status:** approved in chat, implementing immediately

## Goal

Заменить плоский SVG flip-card в `MuscleHeatmap.tsx` на 3D cel-shaded манекен с подсветкой мышечных групп по тренировочному объёму. Закрывает AR-обещание в названии бренда (`TrainingAR`).

## Asset

`public/anatomy/male.glb` — 345 КБ. Источник: Mixamo character (Ch36 base mesh), single-mesh, single-material. Обработка:
1. Resize всех 4096×4096 textures → 16×16 stubs (cel-шейдер их не использует)
2. Draco compression геометрии
3. Animation track сохранён, не используется

Итог: 38.6 МБ → 345 КБ (112× уменьшение).

## Architecture

```
src/components/dashboard/
  MuscleHeatmap.tsx        ← rename → MuscleHeatmap2D.tsx (existing SVG, fallback)
  MuscleHeatmap3D.tsx      ← new, top-level wrapper with WebGL detection
  MuscleHeatmap3D.Body.tsx ← new, r3f Canvas + Body mesh + shader
```

`MuscleHeatmap3D` lazy-loaded via `next/dynamic({ ssr: false })`. Renders 2D fallback while loading. If WebGL2 unavailable → renders 2D permanently.

`dashboard/page.tsx` calls `<MuscleHeatmap3D ...same props />`. Existing prop interface preserved.

## Visual style — cel-shader

- **Material:** `MeshToonMaterial` с 3-step gradient map (через `THREE.DataTexture` 1×3 pixels: `0x404050 / 0x6a6a78 / 0xa0a0b0`).
- **Base body color:** нейтральный `#3a3a4a`. Перекрашивается shader-side в muscle-heat где активно.
- **Outline:** `<Edges threshold={15} color="#000" />` от drei. Backface-extrusion как fallback если ребра слишком шумные.
- **Lighting:**
  - Key: `directionalLight` спереди-сверху, intensity 1.0, белый
  - Rim: `directionalLight` сзади-снизу, intensity 0.6, coral `#FF3B47`
  - Ambient: 0.3
- **Camera:** PerspectiveCamera, fov 30°, position `[0, 1.2, 3.5]`, looking at `[0, 1.0, 0]`. Стартовая поза 3/4 (small 15° Y-rotation).
- **Background:** transparent.

## Muscle highlighting (Phase 1: position-based)

Custom shader (extended from `MeshToonMaterial` via `onBeforeCompile`) принимает uniform-массив `float muscleHeat[15]` — индекс соответствует enum `MuscleGroup`. В fragment shader:

```glsl
// pseudo-code
int regionId = classifyRegion(vWorldPos);  // returns 0..14 or -1
float heat = regionId >= 0 ? muscleHeat[regionId] : 0.0;
vec3 baseColor = mix(BODY_BASE, heatToColor(heat), step(0.01, heat) * 0.85);
```

`classifyRegion` смотрит на normalized world-position вершины и сопоставляет с muscle group по bounding-box правилам. См. секцию ниже.

Регионы (normalized после `useBounds` autofit, body height = 1.0):

| Muscle group  | y range      | z constraint   | |x| constraint |
|---------------|-------------|----------------|---------------|
| chest         | 0.62–0.78   | z > 0          | < 0.35        |
| back          | 0.55–0.78   | z < 0          | < 0.45        |
| lats          | 0.50–0.62   | z < 0          | 0.30–0.50     |
| traps         | 0.78–0.88   | any            | < 0.25        |
| front_delts   | 0.70–0.82   | z > 0          | 0.30–0.50     |
| rear_delts    | 0.70–0.82   | z < 0          | 0.30–0.50     |
| side_delts    | 0.70–0.82   | any            | > 0.45        |
| biceps        | 0.55–0.72   | z > 0          | 0.42–0.58     |
| triceps       | 0.55–0.72   | z < 0          | 0.42–0.58     |
| forearms      | 0.40–0.55   | any            | > 0.45        |
| core          | 0.45–0.62   | z > -0.05      | < 0.25        |
| quads         | 0.20–0.45   | z > 0          | < 0.30        |
| hamstrings    | 0.20–0.45   | z < 0          | < 0.30        |
| glutes        | 0.42–0.50   | z < 0          | < 0.30        |
| calves        | 0.05–0.20   | any            | < 0.25        |

Бoundary cleanup: при пересечении правил приоритет идёт по порядку выше (chest до back и т.д.). Точная prio проверится на тесте, может потребовать тюнинг (±5%).

`muscleHeat[i]` маппится в RGB через ту же 6-step `HEAT` палитру что в текущем `MuscleHeatmap2D.tsx` (`#272733 → #FF7A82`). Heatmap-функция вынесется в `src/lib/utils/muscle-heat.ts` чтобы 2D и 3D её делили.

## Interaction

- **Drag/swipe horizontal** → orbit Y (yaw). Без pitch — не даём перевернуть фигуру.
- **OrbitControls config:** `enableDamping=true`, `enablePan=false`, `enableZoom=false`, `minPolarAngle=maxPolarAngle=π/2`.
- **Tap muscle** → raycast hit-point → `classifyRegion(point)` → push `/history?muscle=<group>` (тот же deep-link что в 2D).
- **No auto-rotate.**
- **Period selector 7d/30d/90d** — UI как в текущем 2D, поверх Canvas. Передаётся через query param как сейчас.

## Performance / loading

- **Lazy:** `next/dynamic(() => import('./MuscleHeatmap3D'), { ssr: false, loading: () => <MuscleHeatmap2D ...props /> })`
- **DRACO:** drei `useGLTF` авто-подгружает Draco-loader из `https://www.gstatic.com/draco/v1/decoders/`. Нулевая конфигурация.
- **WebGL2 gate:** при mount `MuscleHeatmap3D` пробует `canvas.getContext('webgl2')`. Null → возвращает `<MuscleHeatmap2D />` навсегда.
- **Bundle impact:** ~150 KB gzipped (three + r3f + drei subset), весь в lazy chunk. Initial bundle нетронут.
- **Preload:** не делаем. `<details>` collapsed по умолчанию, юзер раскрывает только если хочет смотреть.

## New dependencies

```json
"three": "^0.169.0",
"@react-three/fiber": "^9.0.0",
"@react-three/drei": "^10.0.0",
"@types/three": "^0.169.0"
```

(точные версии — что npm install подтянет на момент install).

## Phase 2 (not now, listed for future)

Если position-based regions «потекут» на стыках:
1. Открыть `male.glb` в Blender
2. В Vertex Paint mode раскрасить 15 регионов в уникальные RGB-цвета
3. Re-export `male.glb` с vertex colors
4. В шейдере читать `vColor` вместо `classifyRegion(vWorldPos)`

Прецизия станет 100%. Работа ~1 час Blender.

## Files changed

- `src/components/dashboard/MuscleHeatmap.tsx` → rename `MuscleHeatmap2D.tsx`
- `src/components/dashboard/MuscleHeatmap3D.tsx` — new
- `src/components/dashboard/MuscleHeatmap3D.Body.tsx` — new (the r3f scene)
- `src/lib/utils/muscle-heat.ts` — new (extracted color helper, shared by 2D and 3D)
- `src/app/(app)/dashboard/page.tsx` — swap component reference
- `package.json` — three + r3f + drei deps
- `public/anatomy/male.glb` — already committed

## Out of scope

- Touch-pose animation (no animation)
- Multiple body variants (one model, gender-neutral muscular)
- Editable muscle regions in UI (Phase 2 if precision suffers)
- Performance instrumentation (Vercel default metrics enough)
