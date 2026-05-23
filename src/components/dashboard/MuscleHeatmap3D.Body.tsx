'use client'

// 3D cel-shaded mannequin with muscle-volume heatmap baked into a custom
// fragment-shader injection on a MeshToonMaterial. Single-mesh model, regions
// are classified by normalized object-space position (see classifyRegion).

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import type { MuscleGroup, MuscleVolume } from '@/lib/types/models'
import {
  MUSCLE_GROUPS_ORDERED,
  heatIntensity,
  volumeFor,
} from '@/lib/utils/muscle-heat'

interface BodyProps {
  muscleVolumes: MuscleVolume[]
  onPickMuscle: (muscle: MuscleGroup) => void
}

// Classification rules — must stay in sync with CLASSIFY_GLSL below.
// Input p is normalized to the model's bbox (each component 0..1).
// First matching rule wins; ordering encodes priority for overlapping boxes.
function classifyRegion(p: THREE.Vector3): MuscleGroup | null {
  const ax = Math.abs(p.x - 0.5) * 2 // re-center x around 0..1 mid
  const y = p.y
  const z = p.z - 0.5 // re-center z around 0
  if (y >= 0.78 && ax < 0.25) return 'traps'
  if (y >= 0.70 && y < 0.82 && ax > 0.45) return 'side_delts'
  if (y >= 0.70 && y < 0.82 && ax >= 0.30 && z > 0) return 'front_delts'
  if (y >= 0.70 && y < 0.82 && ax >= 0.30 && z < 0) return 'rear_delts'
  if (y >= 0.62 && y < 0.78 && z > 0 && ax < 0.35) return 'chest'
  if (y >= 0.55 && y < 0.78 && z < 0 && ax < 0.45) return 'back'
  if (y >= 0.50 && y < 0.62 && z < 0 && ax >= 0.30) return 'lats'
  if (y >= 0.55 && y < 0.72 && ax >= 0.42 && ax <= 0.58 && z > -0.1) return 'biceps'
  if (y >= 0.55 && y < 0.72 && ax >= 0.42 && ax <= 0.58 && z < -0.1) return 'triceps'
  if (y >= 0.40 && y < 0.55 && ax > 0.45) return 'forearms'
  if (y >= 0.45 && y < 0.62 && ax < 0.25) return 'core'
  if (y >= 0.20 && y < 0.45 && ax < 0.30 && z > 0) return 'quads'
  if (y >= 0.20 && y < 0.45 && ax < 0.30 && z < 0) return 'hamstrings'
  if (y >= 0.42 && y < 0.50 && ax < 0.30 && z < 0) return 'glutes'
  if (y >= 0.05 && y < 0.20 && ax < 0.25) return 'calves'
  return null
}

// Same logic in GLSL. Indices align with MUSCLE_GROUPS_ORDERED.
const CLASSIFY_GLSL = `
int classifyRegion(vec3 p) {
  float ax = abs(p.x - 0.5) * 2.0;
  float y = p.y;
  float z = p.z - 0.5;
  if (y >= 0.78 && ax < 0.25) return 3;
  if (y >= 0.70 && y < 0.82 && ax > 0.45) return 5;
  if (y >= 0.70 && y < 0.82 && ax >= 0.30 && z > 0.0) return 4;
  if (y >= 0.70 && y < 0.82 && ax >= 0.30 && z < 0.0) return 6;
  if (y >= 0.62 && y < 0.78 && z > 0.0 && ax < 0.35) return 0;
  if (y >= 0.55 && y < 0.78 && z < 0.0 && ax < 0.45) return 1;
  if (y >= 0.50 && y < 0.62 && z < 0.0 && ax >= 0.30) return 2;
  if (y >= 0.55 && y < 0.72 && ax >= 0.42 && ax <= 0.58 && z > -0.1) return 7;
  if (y >= 0.55 && y < 0.72 && ax >= 0.42 && ax <= 0.58 && z < -0.1) return 8;
  if (y >= 0.40 && y < 0.55 && ax > 0.45) return 9;
  if (y >= 0.45 && y < 0.62 && ax < 0.25) return 10;
  if (y >= 0.20 && y < 0.45 && ax < 0.30 && z > 0.0) return 11;
  if (y >= 0.20 && y < 0.45 && ax < 0.30 && z < 0.0) return 12;
  if (y >= 0.42 && y < 0.50 && ax < 0.30 && z < 0.0) return 13;
  if (y >= 0.05 && y < 0.20 && ax < 0.25) return 14;
  return -1;
}
`

function makeGradientMap(): THREE.DataTexture {
  // 3 cel-shading bands: shadow / mid / highlight
  const data = new Uint8Array([
    0x40, 0x40, 0x50, 0xff,
    0x6a, 0x6a, 0x78, 0xff,
    0xa0, 0xa0, 0xb0, 0xff,
  ])
  const tex = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.needsUpdate = true
  return tex
}

function Model({ muscleVolumes, onPickMuscle }: BodyProps) {
  const { scene } = useGLTF('/anatomy/male.glb', true)
  const groupRef = useRef<THREE.Group>(null)
  const uniformsRef = useRef<{
    uModelMin: { value: THREE.Vector3 }
    uModelSize: { value: THREE.Vector3 }
    uHeat: { value: number[] }
  } | null>(null)

  const heats = useMemo(
    () => MUSCLE_GROUPS_ORDERED.map(m => heatIntensity(volumeFor(m, muscleVolumes))),
    [muscleVolumes],
  )

  const { min, size } = useMemo(() => {
    const box = new THREE.Box3().setFromObject(scene)
    const sz = new THREE.Vector3()
    box.getSize(sz)
    return { min: box.min.clone(), size: sz }
  }, [scene])

  // Auto-fit: center the model on origin XZ and put its feet on the ground.
  // Scale so its height is ~2 world units, matching the camera framing.
  const fit = useMemo(() => {
    const targetHeight = 2
    const scale = size.y > 0 ? targetHeight / size.y : 1
    return {
      scale,
      position: new THREE.Vector3(
        -(min.x + size.x / 2) * scale,
        -min.y * scale,
        -(min.z + size.z / 2) * scale,
      ),
    }
  }, [min, size])

  // Replace all materials with cel-shaded toon + heatmap injection.
  useEffect(() => {
    scene.traverse(obj => {
      if (!(obj instanceof THREE.Mesh)) return

      const mat = new THREE.MeshToonMaterial({
        color: 0x3a3a4a,
        gradientMap: makeGradientMap(),
      })

      mat.onBeforeCompile = shader => {
        shader.uniforms.uModelMin = { value: min }
        shader.uniforms.uModelSize = { value: size }
        shader.uniforms.uHeat = { value: heats.slice() }

        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            `#include <common>
varying vec3 vNormPos;
uniform vec3 uModelMin;
uniform vec3 uModelSize;`,
          )
          .replace(
            '#include <begin_vertex>',
            `#include <begin_vertex>
vNormPos = (position - uModelMin) / max(uModelSize, vec3(0.0001));`,
          )

        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <common>',
            `#include <common>
varying vec3 vNormPos;
uniform float uHeat[15];
${CLASSIFY_GLSL}`,
          )
          .replace(
            '#include <dithering_fragment>',
            `int rid = classifyRegion(vNormPos);
float h = rid >= 0 ? uHeat[rid] : 0.0;
if (h > 0.0) {
  vec3 hot = mix(vec3(0.45, 0.19, 0.21), vec3(1.0, 0.23, 0.28), h);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, hot, h * 0.85);
}
#include <dithering_fragment>`,
          )

        uniformsRef.current = shader.uniforms as unknown as {
          uModelMin: { value: THREE.Vector3 }
          uModelSize: { value: THREE.Vector3 }
          uHeat: { value: number[] }
        }
      }

      obj.material = mat
      // Cast shadows? Skipping for perf.
    })
  }, [scene, min, size, heats])

  // Hot-reload heat values when volumes change without rebuilding the material.
  useEffect(() => {
    if (uniformsRef.current) {
      uniformsRef.current.uHeat.value = heats
    }
  }, [heats])

  function handleClick(e: ThreeEvent<MouseEvent>) {
    e.stopPropagation()
    if (!groupRef.current) return
    const local = groupRef.current.worldToLocal(e.point.clone())
    // Reverse the auto-fit transform: undo position+scale to get model-local
    const modelLocal = new THREE.Vector3(
      (local.x - fit.position.x) / fit.scale,
      (local.y - fit.position.y) / fit.scale,
      (local.z - fit.position.z) / fit.scale,
    )
    const norm = new THREE.Vector3(
      (modelLocal.x - min.x) / Math.max(size.x, 0.0001),
      (modelLocal.y - min.y) / Math.max(size.y, 0.0001),
      (modelLocal.z - min.z) / Math.max(size.z, 0.0001),
    )
    const muscle = classifyRegion(norm)
    if (muscle) onPickMuscle(muscle)
  }

  return (
    <group ref={groupRef} position={fit.position} scale={fit.scale}>
      <primitive object={scene} onClick={handleClick} />
    </group>
  )
}

useGLTF.preload('/anatomy/male.glb')

export function MuscleHeatmap3DBody({ muscleVolumes, onPickMuscle }: BodyProps) {
  return (
    <Canvas
      camera={{ position: [0, 1.2, 3.5], fov: 30 }}
      style={{ width: '100%', height: 320, touchAction: 'none' }}
      gl={{ alpha: true, antialias: true, preserveDrawingBuffer: false }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[2, 4, 3]} intensity={0.9} color="#ffffff" />
      <directionalLight position={[-2, 2, -3]} intensity={0.55} color="#FF3B47" />

      <Suspense fallback={null}>
        <Model muscleVolumes={muscleVolumes} onPickMuscle={onPickMuscle} />
      </Suspense>

      <OrbitControls
        enableDamping
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 2}
        maxPolarAngle={Math.PI / 2}
        rotateSpeed={0.6}
        target={[0, 1, 0]}
      />
    </Canvas>
  )
}
