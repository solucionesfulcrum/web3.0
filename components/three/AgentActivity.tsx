"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useExperienceMotion } from "../experience/ExperienceMotion";

// Extension point for future agents and connections in the existing world.
export default function AgentActivity() {
  const { motion, compact } = useExperienceMotion();
  const group = useRef<THREE.Group>(null);
  const material = useRef<THREE.PointsMaterial>(null);
  const geometry = useMemo(() => {
    const points: number[] = [];
    for (let i = 0; i < 180; i++) {
      const angle = i * 2.399963;
      const radius = 0.9 + (i % 7) * 0.12;
      points.push(Math.cos(angle) * radius, Math.sin(angle) * radius * 0.55, -1.2 - (i % 5) * 0.12);
    }
    const result = new THREE.BufferGeometry();
    result.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return result;
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => { geometry.setDrawRange(0, compact ? 70 : 180); }, [geometry, compact]);
  useFrame((_, delta) => {
    if (!group.current || !material.current) return;
    const active = motion.current.chapter === 3;
    material.current.opacity = THREE.MathUtils.damp(material.current.opacity, active ? 0.65 : 0, 3, Math.min(delta, 0.05));
    if (!motion.current.reducedMotion) group.current.rotation.z += delta * (active ? 0.045 : 0.012);
  });
  return <group ref={group} position={[1.5, -0.1, -0.5]}>
    <points geometry={geometry}>
      <pointsMaterial ref={material} color="#dcecf6" size={0.018} transparent opacity={0}
        depthWrite={false} toneMapped={false} blending={THREE.AdditiveBlending} />
    </points>
  </group>;
}
