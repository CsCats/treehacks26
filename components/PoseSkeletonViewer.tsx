'use client';

import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useMemo } from 'react';
import * as THREE from 'three';

// MoveNet keypoint indices
// 0: nose, 1: left_eye, 2: right_eye, 3: left_ear, 4: right_ear,
// 5: left_shoulder, 6: right_shoulder, 7: left_elbow, 8: right_elbow,
// 9: left_wrist, 10: right_wrist, 11: left_hip, 12: right_hip,
// 13: left_knee, 14: right_knee, 15: left_ankle, 16: right_ankle

const SKELETON_CONNECTIONS: [number, number][] = [
  [0, 1], [0, 2], [1, 3], [2, 4],       // head
  [5, 6],                                  // shoulders
  [5, 7], [7, 9],                          // left arm
  [6, 8], [8, 10],                         // right arm
  [5, 11], [6, 12],                        // torso
  [11, 12],                                // hips
  [11, 13], [13, 15],                      // left leg
  [12, 14], [14, 16],                      // right leg
];

const JOINT_COLORS: Record<string, string> = {
  head: '#ff6b6b',
  arm: '#4ecdc4',
  torso: '#45b7d1',
  leg: '#96ceb4',
};

function getJointColor(index: number): string {
  if (index <= 4) return JOINT_COLORS.head;
  if (index <= 10) return JOINT_COLORS.arm;
  if (index <= 12) return JOINT_COLORS.torso;
  return JOINT_COLORS.leg;
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
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const scale = Math.max(rangeX, rangeY);

  return keypoints.map(k => {
    const nx = ((k.x - minX) / scale - 0.5) * 4;
    const ny = -((k.y - minY) / scale - 0.5) * 4; // flip Y for 3D
    const nz = (k.z || 0) * 4;
    return new THREE.Vector3(nx, ny, nz);
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

export default function PoseSkeletonViewer({ keypoints, width = 500, height = 400 }: PoseSkeletonViewerProps) {
  const positions = useMemo(() => normalizeKeypoints(keypoints), [keypoints]);

  if (keypoints.length === 0) {
    return (
      <div
        style={{ width, height }}
        className="flex items-center justify-center rounded-lg bg-zinc-900 text-zinc-500"
      >
        No pose data available
      </div>
    );
  }

  return (
    <div style={{ width, height }} className="rounded-lg overflow-hidden border border-zinc-700">
      <Canvas
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
        <ambientLight intensity={0.6} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} />
        <Joints positions={positions} keypoints={keypoints} />
        <Bones positions={positions} keypoints={keypoints} />
        <gridHelper args={[10, 10, '#333', '#222']} rotation={[Math.PI / 2, 0, 0]} />
        <OrbitControls enableDamping dampingFactor={0.1} />
      </Canvas>
    </div>
  );
}
