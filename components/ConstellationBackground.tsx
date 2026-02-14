'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useTheme } from '@/lib/ThemeContext';

const isDark = (resolved: string) => resolved === 'dark';

// --- Floating particles that mimic pose keypoints ---
function Particles({ count = 80, dark }: { count?: number; dark: boolean }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const lineRef = useRef<THREE.LineSegments>(null);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Particle color: light on dark bg, darker on light bg
  const particleColor = dark ? '#60a5fa' : '#3b82f6';
  const lineAlphaBase = dark ? 0.35 : 0.5;

  // Generate random particle positions and velocities
  const particles = useMemo(() => {
    const arr = [];
    for (let i = 0; i < count; i++) {
      arr.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 12,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 6
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.003,
          (Math.random() - 0.5) * 0.003,
          (Math.random() - 0.5) * 0.002
        ),
        scale: 0.02 + Math.random() * 0.04,
      });
    }
    return arr;
  }, [count]);

  // Pre-allocate line geometry
  const maxLines = 200;
  const linePositions = useMemo(
    () => new Float32Array(maxLines * 6),
    [maxLines]
  );
  const lineColors = useMemo(
    () => new Float32Array(maxLines * 6),
    [maxLines]
  );

  useFrame(() => {
    if (!meshRef.current || !lineRef.current) return;

    let lineCount = 0;
    const connectionDist = 2.2;

    // Move particles
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.position.add(p.velocity);

      // Soft boundary bounce
      if (Math.abs(p.position.x) > 6) p.velocity.x *= -1;
      if (Math.abs(p.position.y) > 4) p.velocity.y *= -1;
      if (Math.abs(p.position.z) > 3) p.velocity.z *= -1;

      dummy.position.copy(p.position);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;

    // Draw lines between nearby particles
    for (let i = 0; i < particles.length && lineCount < maxLines; i++) {
      for (let j = i + 1; j < particles.length && lineCount < maxLines; j++) {
        const dist = particles[i].position.distanceTo(particles[j].position);
        if (dist < connectionDist) {
          const alpha = 1 - dist / connectionDist;
          const idx = lineCount * 6;

          linePositions[idx] = particles[i].position.x;
          linePositions[idx + 1] = particles[i].position.y;
          linePositions[idx + 2] = particles[i].position.z;
          linePositions[idx + 3] = particles[j].position.x;
          linePositions[idx + 4] = particles[j].position.y;
          linePositions[idx + 5] = particles[j].position.z;

          // Blue-to-purple gradient on lines (darker in light mode)
          const mult = dark ? 1 : 0.45;
          const r = (0.35 * alpha * mult);
          const g = (0.5 * alpha * mult);
          const b = (1.0 * alpha * mult);
          lineColors[idx] = r;
          lineColors[idx + 1] = g;
          lineColors[idx + 2] = b;
          lineColors[idx + 3] = r * 0.6;
          lineColors[idx + 4] = g * 0.3;
          lineColors[idx + 5] = b * 0.8;

          lineCount++;
        }
      }
    }

    const lineGeo = lineRef.current.geometry;
    lineGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(linePositions.slice(0, lineCount * 6), 3)
    );
    lineGeo.setAttribute(
      'color',
      new THREE.BufferAttribute(lineColors.slice(0, lineCount * 6), 3)
    );
    lineGeo.attributes.position.needsUpdate = true;
    lineGeo.attributes.color.needsUpdate = true;
    lineGeo.setDrawRange(0, lineCount * 2);
  });

  return (
    <>
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color={particleColor} transparent opacity={dark ? 0.8 : 0.7} />
      </instancedMesh>
      <lineSegments ref={lineRef}>
        <bufferGeometry />
        <lineBasicMaterial vertexColors transparent opacity={lineAlphaBase} />
      </lineSegments>
    </>
  );
}

// --- Floating skeleton figure (pose keypoints) ---
function PoseSkeleton({ dark }: { dark: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const dotColor = dark ? '#a78bfa' : '#7c3aed';
  const armColor = dark ? '#60a5fa' : '#2563eb';
  const legColor = dark ? '#34d399' : '#059669';
  const lineColor = dark ? '#818cf8' : '#6366f1';

  // Keypoints for a human-like skeleton (17 points like MoveNet)
  const keypoints = useMemo(
    () => [
      [0, 1.6, 0], // 0  nose
      [-0.1, 1.7, 0], // 1  left eye
      [0.1, 1.7, 0], // 2  right eye
      [-0.2, 1.6, 0], // 3  left ear
      [0.2, 1.6, 0], // 4  right ear
      [-0.5, 1.1, 0], // 5  left shoulder
      [0.5, 1.1, 0], // 6  right shoulder
      [-0.9, 0.6, 0], // 7  left elbow
      [0.9, 0.6, 0], // 8  right elbow
      [-1.2, 0.2, 0], // 9  left wrist
      [1.2, 0.2, 0], // 10 right wrist
      [-0.3, 0.0, 0], // 11 left hip
      [0.3, 0.0, 0], // 12 right hip
      [-0.35, -0.7, 0], // 13 left knee
      [0.35, -0.7, 0], // 14 right knee
      [-0.4, -1.4, 0], // 15 left ankle
      [0.4, -1.4, 0], // 16 right ankle
    ],
    []
  );

  const connections = useMemo(
    () => [
      [0, 1], [0, 2], [1, 3], [2, 4], // face
      [5, 6], [5, 7], [7, 9], [6, 8], [8, 10], // arms
      [5, 11], [6, 12], [11, 12], // torso
      [11, 13], [13, 15], [12, 14], [14, 16], // legs
    ],
    []
  );

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.y = Math.sin(t * 0.3) * 0.3;
    groupRef.current.position.y = Math.sin(t * 0.5) * 0.1 + 0.2;
  });

  const linePositions = useMemo(() => {
    const pos: number[] = [];
    for (const [a, b] of connections) {
      pos.push(...keypoints[a], ...keypoints[b]);
    }
    return new Float32Array(pos);
  }, [keypoints, connections]);

  return (
    <group ref={groupRef} position={[3.5, 0, -1]} scale={1.1}>
      {/* Keypoint dots */}
      {keypoints.map((kp, i) => (
        <mesh key={i} position={kp as [number, number, number]}>
          <sphereGeometry args={[0.06, 12, 12]} />
          <meshBasicMaterial
            color={i < 5 ? dotColor : i < 11 ? armColor : legColor}
            transparent
            opacity={dark ? 0.9 : 0.85}
          />
        </mesh>
      ))}
      {/* Skeleton lines */}
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[linePositions, 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={lineColor} transparent opacity={dark ? 0.6 : 0.5} />
      </lineSegments>
      {/* Glow around skeleton (subtler in light mode) */}
      <pointLight position={[0, 0.5, 1]} color={lineColor} intensity={dark ? 2 : 0.8} distance={4} />
    </group>
  );
}

export default function ConstellationBackground() {
  const { resolved } = useTheme();
  const dark = isDark(resolved);

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 5], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={dark ? 0.1 : 0.3} />
        <Particles count={70} dark={dark} />
        <PoseSkeleton dark={dark} />
      </Canvas>
    </div>
  );
}
