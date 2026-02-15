'use client';

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { useMemo, useRef, useState, useEffect } from 'react';
import * as THREE from 'three';

interface Keypoint {
  x: number;
  y: number;
  z?: number;
  score?: number;
  name?: string;
}

interface PoseAvatarViewerProps {
  keypoints: Keypoint[];
  width?: number;
  height?: number;
  autoRotate?: boolean;
}

// BlazePose keypoint mapping to body parts
const BODY_PARTS = {
  HEAD: [0, 7, 8], // nose, ears
  NECK: [11, 12], // shoulders (used to calculate neck position)
  LEFT_UPPER_ARM: [11, 13],
  LEFT_LOWER_ARM: [13, 15],
  RIGHT_UPPER_ARM: [12, 14],
  RIGHT_LOWER_ARM: [14, 16],
  TORSO: [11, 12, 23, 24], // shoulders to hips
  LEFT_UPPER_LEG: [23, 25],
  LEFT_LOWER_LEG: [25, 27],
  RIGHT_UPPER_LEG: [24, 26],
  RIGHT_LOWER_LEG: [26, 28],
};

function normalizeKeypoints(keypoints: Keypoint[]): THREE.Vector3[] {
  if (keypoints.length === 0) return [];

  const positions: THREE.Vector3[] = [];

  for (let i = 0; i < keypoints.length; i++) {
    const kp = keypoints[i];
    if (!kp) {
      positions.push(new THREE.Vector3(0, 0, 0));
      continue;
    }
    positions.push(new THREE.Vector3(
      Number.isFinite(kp.x) ? kp.x : 0,
      Number.isFinite(kp.y) ? kp.y : 0,
      Number.isFinite(kp.z) ? kp.z : 0
    ));
  }

  // Normalize to centered coordinates
  const xs = positions.map(p => p.x);
  const ys = positions.map(p => p.y);
  const zs = positions.map(p => p.z).filter(z => z !== 0);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const minZ = zs.length > 0 ? Math.min(...zs) : 0;
  const maxZ = zs.length > 0 ? Math.max(...zs) : 0;

  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const rangeZ = maxZ - minZ || 1;
  const scale = Math.max(rangeX, rangeY);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const centerZ = (minZ + maxZ) / 2;

  return positions.map(p => new THREE.Vector3(
    ((p.x - centerX) / scale) * 3,
    -((p.y - centerY) / scale) * 3 + 1, // flip Y and offset up
    ((p.z - centerZ) / rangeZ) * 1.5
  ));
}

function Limb({ start, end, radius = 0.08, color = '#4ecdc4' }: {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius?: number;
  color?: string;
}) {
  const direction = useMemo(() => new THREE.Vector3().subVectors(end, start), [start, end]);
  const length = useMemo(() => direction.length(), [direction]);
  const midpoint = useMemo(() => new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5), [start, end]);

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion();
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    return q;
  }, [direction]);

  if (length < 0.01) return null;

  return (
    <mesh position={midpoint} quaternion={quaternion}>
      <capsuleGeometry args={[radius, length, 8, 16]} />
      <meshStandardMaterial
        color={color}
        roughness={0.4}
        metalness={0.1}
      />
    </mesh>
  );
}

function Joint({ position, radius = 0.12, color = '#ff6b6b' }: {
  position: THREE.Vector3;
  radius?: number;
  color?: string;
}) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[radius, 16, 16]} />
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.2}
        emissive={color}
        emissiveIntensity={0.1}
      />
    </mesh>
  );
}

function Avatar({ positions, keypoints }: { positions: THREE.Vector3[]; keypoints: Keypoint[] }) {
  if (positions.length < 33) return null;

  const validScore = (idx: number) => (keypoints[idx]?.score ?? 1) > 0.3;

  // Calculate head position (average of nose and ears)
  const headPos = useMemo(() => {
    const nose = positions[0];
    const leftEar = positions[7];
    const rightEar = positions[8];
    return new THREE.Vector3()
      .add(nose)
      .add(leftEar)
      .add(rightEar)
      .multiplyScalar(1/3);
  }, [positions]);

  // Calculate neck position (midpoint between shoulders)
  const neckPos = useMemo(() => {
    return new THREE.Vector3()
      .addVectors(positions[11], positions[12])
      .multiplyScalar(0.5);
  }, [positions]);

  // Calculate torso center
  const torsoCenter = useMemo(() => {
    return new THREE.Vector3()
      .add(positions[11])
      .add(positions[12])
      .add(positions[23])
      .add(positions[24])
      .multiplyScalar(0.25);
  }, [positions]);

  return (
    <group>
      {/* Head */}
      {validScore(0) && (
        <mesh position={headPos}>
          <sphereGeometry args={[0.25, 32, 32]} />
          <meshStandardMaterial
            color="#ffb6c1"
            roughness={0.5}
            metalness={0.1}
          />
        </mesh>
      )}

      {/* Neck */}
      {validScore(11) && validScore(12) && (
        <Limb start={headPos} end={neckPos} radius={0.08} color="#ffa07a" />
      )}

      {/* Torso */}
      {validScore(11) && validScore(12) && (
        <>
          <Limb start={positions[11]} end={positions[23]} radius={0.12} color="#45b7d1" />
          <Limb start={positions[12]} end={positions[24]} radius={0.12} color="#45b7d1" />
          <Limb start={positions[11]} end={positions[12]} radius={0.11} color="#5dade2" />
          <Limb start={positions[23]} end={positions[24]} radius={0.11} color="#5dade2" />
        </>
      )}

      {/* Left Arm */}
      {validScore(11) && validScore(13) && (
        <>
          <Limb start={positions[11]} end={positions[13]} radius={0.09} color="#4ecdc4" />
          <Joint position={positions[11]} radius={0.13} color="#48c9b0" />
          <Joint position={positions[13]} radius={0.11} color="#48c9b0" />
        </>
      )}
      {validScore(13) && validScore(15) && (
        <>
          <Limb start={positions[13]} end={positions[15]} radius={0.08} color="#52d4c7" />
          <Joint position={positions[15]} radius={0.1} color="#4dd0c2" />
        </>
      )}

      {/* Right Arm */}
      {validScore(12) && validScore(14) && (
        <>
          <Limb start={positions[12]} end={positions[14]} radius={0.09} color="#4ecdc4" />
          <Joint position={positions[12]} radius={0.13} color="#48c9b0" />
          <Joint position={positions[14]} radius={0.11} color="#48c9b0" />
        </>
      )}
      {validScore(14) && validScore(16) && (
        <>
          <Limb start={positions[14]} end={positions[16]} radius={0.08} color="#52d4c7" />
          <Joint position={positions[16]} radius={0.1} color="#4dd0c2" />
        </>
      )}

      {/* Left Leg */}
      {validScore(23) && validScore(25) && (
        <>
          <Limb start={positions[23]} end={positions[25]} radius={0.11} color="#96ceb4" />
          <Joint position={positions[23]} radius={0.14} color="#88c9a8" />
          <Joint position={positions[25]} radius={0.12} color="#7fc4a0" />
        </>
      )}
      {validScore(25) && validScore(27) && (
        <>
          <Limb start={positions[25]} end={positions[27]} radius={0.1} color="#a0d4b8" />
          <Joint position={positions[27]} radius={0.11} color="#8bcea8" />
        </>
      )}

      {/* Right Leg */}
      {validScore(24) && validScore(26) && (
        <>
          <Limb start={positions[24]} end={positions[26]} radius={0.11} color="#96ceb4" />
          <Joint position={positions[24]} radius={0.14} color="#88c9a8" />
          <Joint position={positions[26]} radius={0.12} color="#7fc4a0" />
        </>
      )}
      {validScore(26) && validScore(28) && (
        <>
          <Limb start={positions[26]} end={positions[28]} radius={0.1} color="#a0d4b8" />
          <Joint position={positions[28]} radius={0.11} color="#8bcea8" />
        </>
      )}

      {/* Hands (small spheres) */}
      {validScore(15) && <Joint position={positions[15]} radius={0.08} color="#ffd93d" />}
      {validScore(16) && <Joint position={positions[16]} radius={0.08} color="#ffd93d" />}

      {/* Feet (small elongated) */}
      {validScore(27) && (
        <mesh position={positions[27]}>
          <boxGeometry args={[0.2, 0.08, 0.12]} />
          <meshStandardMaterial color="#b5a89e" roughness={0.6} />
        </mesh>
      )}
      {validScore(28) && (
        <mesh position={positions[28]}>
          <boxGeometry args={[0.2, 0.08, 0.12]} />
          <meshStandardMaterial color="#b5a89e" roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}

function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[10, 10]} />
      <meshStandardMaterial
        color="#1a1a1a"
        roughness={0.8}
        metalness={0.2}
        opacity={0.3}
        transparent
      />
    </mesh>
  );
}

export default function PoseAvatarViewer({
  keypoints,
  width = 500,
  height = 400,
  autoRotate = false
}: PoseAvatarViewerProps) {
  const positions = useMemo(() => normalizeKeypoints(keypoints), [keypoints]);

  if (keypoints.length === 0) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-500"
      >
        No pose data available
      </div>
    );
  }

  return (
    <div style={{ width, height }} className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700 bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-black">
      <Canvas
        shadows
        gl={{ powerPreference: 'high-performance', antialias: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.2;
        }}
      >
        <PerspectiveCamera makeDefault position={[0, 1.5, 5]} fov={50} />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} />
        <pointLight position={[0, 3, 0]} intensity={0.3} color="#ffffff" />
        <spotLight
          position={[0, 5, 0]}
          angle={0.6}
          penumbra={0.5}
          intensity={0.5}
          castShadow
        />

        <Avatar positions={positions} keypoints={keypoints} />
        <Floor />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          autoRotate={autoRotate}
          autoRotateSpeed={1}
          maxPolarAngle={Math.PI / 2}
          minDistance={3}
          maxDistance={10}
        />

        {/* Environment fog */}
        <fog attach="fog" args={['#000000', 8, 15]} />
      </Canvas>
    </div>
  );
}
