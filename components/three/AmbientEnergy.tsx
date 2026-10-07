"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useExperienceMotion } from "../experience/ExperienceMotion";

// Independent points and short optical streaks, with no connecting network.
export default function AmbientEnergy() {
  const { motion, compact } = useExperienceMotion();
  const { size, viewport } = useThree();
  const { geometry, dust, haze } = useMemo(() => {
    let seed = 30819;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const positions: number[] = [];
    const colors: number[] = [];
    const details: number[] = [];
    for (let i = 0; i < (compact ? 1500 : 4600); i++) {
      const x = (random() - 0.5) * 14;
      const spread = (random() + random() + random() - 1.5);
      const band = 0.25 - x * 0.15 + Math.sin(x * 1.6) * 0.28;
      const y = i % 5 === 0 ? (random() - 0.5) * 7 : band + spread * 1.15;
      const z = -0.65 - random() * 3.5;
      positions.push(x, y, z);
      const cool = random() < THREE.MathUtils.smoothstep(x, -1.5, 2.0);
      const color = new THREE.Color(cool ? (i % 7 === 0 ? "#edf8ff" : "#85bedd") : (i % 7 === 0 ? "#ffd49b" : "#fa6c1a"));
      const kind = i % 137 === 0 ? 1 : i % 61 === 0 ? 2 : i % 43 === 0 ? 3 : 0;
      color.multiplyScalar(kind === 1 ? 3.6 : 0.65 + random() * 2.2);
      colors.push(color.r, color.g, color.b);
      const particleSize = kind === 1 ? 0.20 + random() * 0.18
        : kind === 2 ? 0.14 + random() * 0.19
        : kind === 3 ? 0.08 + random() * 0.15
        : 0.012 + random() * 0.032;
      details.push(particleSize, kind, random() * Math.PI * 2, random());
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute("aDetail", new THREE.Float32BufferAttribute(details, 4));
    const dust = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uScale: { value: 800 } },
      vertexShader: `
        attribute vec4 aDetail;
        uniform float uTime;
        uniform float uScale;
        varying vec3 vColor;
        varying float vKind;
        varying float vOpacity;
        void main() {
          vec3 p = position;
          // Drift left through a seamless field to support the rightward motion.
          p.x = mod(p.x + 7.0 - uTime * (0.035 + aDetail.w * 0.055), 14.0) - 7.0;
          p.y += sin(uTime * 0.22 + aDetail.z) * 0.035;
          vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * viewPosition;
          gl_PointSize = clamp(aDetail.x * uScale / -viewPosition.z, 2.0, 90.0);
          vColor = color;
          vKind = aDetail.y;
          float shimmer = 0.68 + 0.32 * sin(uTime * (0.7 + aDetail.w) + aDetail.z);
          vOpacity = shimmer * (aDetail.y > 2.5 ? 0.22 : 0.8);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vKind;
        varying float vOpacity;
        void main() {
          vec2 p = (gl_PointCoord - 0.5) * 2.0;
          float radius = length(p);
          float light;
          if (vKind > 2.5) {
            light = exp(-radius * radius * 4.0) * (1.0 - smoothstep(0.5, 1.0, radius));
          } else if (vKind > 1.5) {
            light = exp(-p.y * p.y * 650.0) * pow(max(0.0, 1.0 - abs(p.x)), 2.0);
          } else if (vKind > 0.5) {
            float horizontal = exp(-abs(p.y) * 85.0) * pow(max(0.0, 1.0 - abs(p.x)), 3.0);
            float vertical = exp(-abs(p.x) * 85.0) * pow(max(0.0, 1.0 - abs(p.y)), 3.0);
            light = exp(-radius * radius * 110.0) + (horizontal + vertical) * 0.65;
          } else {
            light = exp(-radius * radius * 8.0) * (1.0 - smoothstep(0.6, 1.0, radius));
          }
          if (light < 0.005) discard;
          gl_FragColor = vec4(vColor, light * vOpacity);
        }
      `,
      vertexColors: true, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
    });
    const haze = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 } },
      vertexShader: `
        varying vec2 vPosition;
        void main() {
          vPosition = position.xy;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        varying vec2 vPosition;
        void main() {
          vec2 p = vPosition;
          float warm = exp(-dot((p - vec2(-1.8, 0.8)) / vec2(2.1, 1.3), (p - vec2(-1.8, 0.8)) / vec2(2.1, 1.3)));
          float cool = exp(-dot((p - vec2(2.4, -0.5)) / vec2(2.8, 1.2), (p - vec2(2.4, -0.5)) / vec2(2.8, 1.2)));
          float variation = 0.92 + 0.08 * sin(p.x * 2.0 + p.y * 3.0 + uTime * 0.2);
          vec3 color = (vec3(0.085, 0.019, 0.002) * warm + vec3(0.012, 0.042, 0.065) * cool) * variation;
          gl_FragColor = vec4(color, 1.0);
        }
      `,
      transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, toneMapped: false,
    });
    return { geometry, dust, haze };
  }, [compact]);
  useEffect(() => {
    dust.uniforms.uScale.value = size.height * viewport.dpr;
  }, [dust, size.height, viewport.dpr]);
  useEffect(() => () => {
    geometry.dispose();
    dust.dispose();
    haze.dispose();
  }, [geometry, dust, haze]);
  useFrame((_, delta) => {
    if (motion.current.reducedMotion) return;
    const speed = motion.current.chapter === 3 ? 1.5 : 1;
    dust.uniforms.uTime.value += Math.min(delta, 0.05) * speed;
    haze.uniforms.uTime.value += Math.min(delta, 0.05);
  });
  return <group>
    <mesh position={[0, 0, -4.8]} material={haze}>
      <planeGeometry args={[32, 22]} />
    </mesh>
    <points geometry={geometry} material={dust} frustumCulled={false} />
  </group>;
}
