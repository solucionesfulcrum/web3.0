"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef, type ReactNode } from "react";
import * as THREE from "three";
import { useExperienceMotion } from "../experience/ExperienceMotion";

// Positions are viewport fractions measured from the top-left corner.
export const CORE_TRANSITION = {
  heroPosition: { x: 0.73, y: 0.53 },
  mobileHeroPosition: { x: 0.5, y: 0.69 },
  scrollDistance: 1.0,
  damping: 7,
  pointerIntensity: 0.10,
};

export default function ScrollController({ children }: { children: ReactNode }) {
  const root = useRef<THREE.Group>(null);
  const initialized = useRef(false);
  const { motion, compact } = useExperienceMotion();
  const { camera, size } = useThree();
  useFrame((_, delta) => {
    if (!root.current || !(camera instanceof THREE.PerspectiveCamera)) return;
    const state = motion.current;
    const progress = THREE.MathUtils.clamp(state.heroProgress / CORE_TRANSITION.scrollDistance, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    const height = 2 * camera.position.z * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const width = height * size.width / size.height;
    // The tube-free silhouette fits inside the 88px circle, including its diagonal.
    const scale = THREE.MathUtils.lerp(1, (54 / size.width) * width / 2.4, eased);
    const initial = compact ? CORE_TRANSITION.mobileHeroPosition : CORE_TRANSITION.heroPosition;
    const final = { x: 1 - 68 / size.width, y: 1 - 68 / size.height };
    const centerX = THREE.MathUtils.lerp(0.38, -0.37, eased);
    const x = (THREE.MathUtils.lerp(initial.x, final.x, eased) - 0.5) * width - centerX * scale;
    const y = (0.5 - THREE.MathUtils.lerp(initial.y, final.y, eased)) * height - 0.035 * scale * eased;
    const immediate = !initialized.current || state.reducedMotion;
    const step = Math.min(delta, 0.05);
    root.current.scale.setScalar(immediate ? scale : THREE.MathUtils.damp(root.current.scale.x, scale, CORE_TRANSITION.damping, step));
    root.current.position.x = immediate ? x : THREE.MathUtils.damp(root.current.position.x, x, CORE_TRANSITION.damping, step);
    root.current.position.y = immediate ? y : THREE.MathUtils.damp(root.current.position.y, y, CORE_TRANSITION.damping, step);
    const pointer = state.reducedMotion ? 0 : CORE_TRANSITION.pointerIntensity * (1 - eased);
    root.current.rotation.x = THREE.MathUtils.damp(root.current.rotation.x, -state.pointerY * pointer * 0.6, 4, step);
    root.current.rotation.y = THREE.MathUtils.damp(root.current.rotation.y, state.pointerX * pointer, 4, step);
    initialized.current = true;
  });
  return <group ref={root}>{children}</group>;
}
