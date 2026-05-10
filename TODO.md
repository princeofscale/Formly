# GymLog — Roadmap

## Phase 1: Infrastructure + Auth ✅ DONE
- [x] Initialize Next.js 16 project
- [x] Set up Supabase (schema, RLS, 29 seed exercises)
- [x] Auth: login / register / logout (Server Actions + useActionState)
- [x] Core utilities: 1RM, muscle volume, BMI (23 tests passing)
- [x] Dashboard skeleton
- [x] Deploy to Vercel → https://training-ar.vercel.app

## Phase 2: Active Workout Logging ← NEXT
- [ ] Create / resume workout session
- [ ] Exercise search + add from library
- [ ] Set entry: weight, reps, RPE
- [ ] Last Time Hints (auto-fill from previous session)
- [ ] PR detection (e1RM vs historical best)
- [ ] Rest timer (auto-start after set save)
- [ ] Quick input buttons (+/-2.5kg, +/-1 rep)
- [ ] Plate calculator
- [ ] Finish workout + total volume calculation

## Phase 3: Exercise Library
- [ ] Browse all global exercises
- [ ] Filter by muscle group / equipment
- [ ] Create custom exercises
- [ ] Edit / delete custom exercises

## Phase 4: History
- [ ] Sessions list (chronological)
- [ ] Session detail: all exercises, sets, volume

## Phase 5: Dashboard (full)
- [ ] Training schedule: today = gym or rest?
- [ ] Last 3 sessions summary
- [ ] 7-day muscle heatmap (react-body-highlighter)

## Phase 6: Analytics
- [ ] e1RM trend chart per exercise (Recharts)
- [ ] Monthly total tonnage chart
- [ ] Muscle group volume distribution (last 4 weeks)
- [ ] Volume Landmarks: MV / MEV–MRV / MRV+ per muscle

## Phase 7: Profile + Progression
- [ ] Edit profile: weight, height, age, training_since, location, schedule
- [ ] Auto-display: BMI, training age
- [ ] Double progression suggestions after workout
