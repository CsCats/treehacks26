'use client';

import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useTheme } from '@/lib/ThemeContext';

// BlazePose keypoint indices (33 points total, but we use the main 17)
// 0: nose, 1: left_eye_inner, 2: left_eye, 3: left_eye_outer, 4: right_eye_inner,
// 5: right_eye, 6: right_eye_outer, 7: left_ear, 8: right_ear,
// 9: mouth_left, 10: mouth_right, 11: left_shoulder, 12: right_shoulder,
// 13: left_elbow, 14: right_elbow, 15: left_wrist, 16: right_wrist,
// 17: left_pinky, 18: right_pinky, 19: left_index, 20: right_index,
// 21: left_thumb, 22: right_thumb, 23: left_hip, 24: right_hip,
// 25: left_knee, 26: right_knee, 27: left_ankle, 28: right_ankle,
// 29: left_heel, 30: right_heel, 31: left_foot_index, 32: right_foot_index

// BlazePose main skeleton connections (simplified for stability)
const SKELETON_CONNECTIONS: [number, number][] = [
  // Face outline
  [0, 7], [0, 8],                            // nose to ears
  // Shoulders and arms
  [11, 12],                                  // shoulders
  [11, 13], [13, 15],                        // left arm
  [12, 14], [14, 16],                        // right arm
  [15, 17], [15, 19], [15, 21],             // left hand
  [16, 18], [16, 20], [16, 22],             // right hand
  // Torso
  [11, 23], [12, 24],                        // shoulders to hips
  [23, 24],                                  // hips
  // Legs
  [23, 25], [25, 27],                        // left leg
  [24, 26], [26, 28],                        // right leg
  [27, 29], [27, 31],                        // left foot
  [28, 30], [28, 32],                        // right foot
];

const JOINT_COLORS: Record<string, string> = {
  head: '#ff6b6b',
  arm: '#4ecdc4',
  torso: '#45b7d1',
  leg: '#96ceb4',
};

function getJointColor(index: number): string {
  // BlazePose keypoint coloring
  if (index <= 10) return JOINT_COLORS.head;       // face points
  if (index <= 22) return JOINT_COLORS.arm;        // arms and hands
  if (index <= 24) return JOINT_COLORS.torso;      // hips/torso
  return JOINT_COLORS.leg;                          // legs and feet
}

interface Keypoint {
  x: number;
  y: number;
  z?: number;
  score?: number;
  name?: string;
}

interface PoseSkeletonViewerProps {
  keypoints: Keypoint[];
  width?: number;
  height?: number;
}

function normalizeKeypoints(keypoints: Keypoint[]): THREE.Vector3[] {
  if (keypoints.length === 0) return [];

  // Normalize to [-1, 1] range centered at origin
  const xs = keypoints.map(k => k.x);
  const ys = keypoints.map(k => k.y);
  const zs = keypoints.map(k => k.z || 0).filter(z => z !== 0);

  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = Math.max(rangeX, rangeY);

  // Calculate z-scale for depth (BlazePose z values are typically smaller)
  const minZ = zs.length > 0 ? Math.min(...zs) : 0;
  const maxZ = zs.length > 0 ? Math.max(...zs) : 0;
  const rangeZ = maxZ - minZ || 1;

  return keypoints.map(k => {
    const nx = ((k.x - minX) / scale - 0.5) * 4;
    const ny = -((k.y - minY) / scale - 0.5) * 4; // flip Y for 3D
    // Scale z separately and amplify for better 3D effect
    const nz = ((k.z || 0) - minZ) / rangeZ * 2 - 1; // normalize to [-1, 1]
    return new THREE.Vector3(nx, ny, nz * 2); // amplify depth by 2x
  });
}

function Joints({ positions, keypoints }: { positions: THREE.Vector3[]; keypoints: Keypoint[] }) {
  return (
    <>
      {positions.map((pos, i) => {
        const score = keypoints[i]?.score ?? 1;
        if (score < 0.3) return null;
        return (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[0.08, 16, 16]} />
            <meshStandardMaterial
              color={getJointColor(i)}
              emissive={getJointColor(i)}
              emissiveIntensity={0.3}
            />
          </mesh>
        );
      })}
    </>
  );
}

function Bones({ positions, keypoints }: { positions: THREE.Vector3[]; keypoints: Keypoint[] }) {
  const lines = useMemo(() => {
    return SKELETON_CONNECTIONS.filter(([a, b]) => {
      const scoreA = keypoints[a]?.score ?? 1;
      const scoreB = keypoints[b]?.score ?? 1;
      return scoreA > 0.3 && scoreB > 0.3 && positions[a] && positions[b];
    }).map(([a, b]) => ({
      start: positions[a],
      end: positions[b],
      color: getJointColor(a),
    }));
  }, [positions, keypoints]);

  return (
    <>
      {lines.map((line, i) => {
        const direction = new THREE.Vector3().subVectors(line.end, line.start);
        const length = direction.length();
        const midpoint = new THREE.Vector3().addVectors(line.start, line.end).multiplyScalar(0.5);
        const orientation = new THREE.Quaternion();
        orientation.setFromUnitVectors(
          new THREE.Vector3(0, 1, 0),
          direction.clone().normalize()
        );

        return (
          <mesh key={i} position={midpoint} quaternion={orientation}>
            <cylinderGeometry args={[0.03, 0.03, length, 8]} />
            <meshStandardMaterial
              color={line.color}
              emissive={line.color}
              emissiveIntensity={0.2}
            />
          </mesh>
        );
      })}
    </>
  );
}

function SceneBackground() {
  const { scene } = useThree();
  const { resolved } = useTheme();
  useEffect(() => {
    scene.background = new THREE.Color(resolved === 'dark' ? '#18181b' : '#f4f4f5');
    return () => {
      scene.background = null;
    };
  }, [scene, resolved]);
  return null;
}

function ThemeGrid() {
  const { resolved } = useTheme();
  const gridColor = resolved === 'dark' ? '#404040' : '#d4d4d8';
  const gridColorSecondary = resolved === 'dark' ? '#27272a' : '#e4e4e7';
  return <gridHelper args={[10, 10, gridColor, gridColorSecondary]} rotation={[Math.PI / 2, 0, 0]} />;
}

export default function PoseSkeletonViewer({ keypoints, width = 500, height = 400 }: PoseSkeletonViewerProps) {
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
    <div style={{ width, height, maxWidth: '100%' }} className="rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
      <Canvas
        style={{ display: 'block' }}
        camera={{ position: [0, 0, 5], fov: 50 }}
        gl={{ powerPreference: 'low-power', antialias: false }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement;
          canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('WebGL context lost — will restore automatically');
          });
          canvas.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored');
          });
        }}
      >
        <SceneBackground />
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <Joints positions={positions} keypoints={keypoints} />
        <Bones positions={positions} keypoints={keypoints} />
        <ThemeGrid />
        <OrbitControls enableDamping dampingFactor={0.1} />
      </Canvas>
    </div>
  );
}
