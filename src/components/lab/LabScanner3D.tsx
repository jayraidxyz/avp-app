import React, { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

export type CameraPreset = 'overview' | 'core' | 'top';

interface LabScanner3DProps {
  completedStages: number; // 0..5
  activeStage: number; // 1..5
  cameraPreset: CameraPreset;
  presetVersion: number;
  turnVersion: number;
  turnDirection: -1 | 1;
  autoOrbit: boolean;
}

const _camTarget = new THREE.Vector3();
const _lookTarget = new THREE.Vector3();
const _offsetVec = new THREE.Vector3();
const _yAxis = new THREE.Vector3(0, 1, 0);
const _ringColor = new THREE.Color();
const _redColor = new THREE.Color('#E10000');
const _whiteColor = new THREE.Color('#FFFFFF');
const _dimColor = new THREE.Color('#2A2A2A');

function createPlatformGridTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#080808';
    ctx.fillRect(0, 0, size, size);

    const grad = ctx.createRadialGradient(size / 2, size / 2, 16, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(225, 0, 0, 0.18)');
    grad.addColorStop(1, 'rgba(5, 5, 5, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    ctx.strokeStyle = 'rgba(225, 0, 0, 0.25)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i <= size; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const ScannerSceneContent: React.FC<LabScanner3DProps> = ({
  completedStages,
  activeStage,
  cameraPreset,
  presetVersion,
  turnVersion,
  turnDirection,
  autoOrbit,
}) => {
  const controlsRef = useRef<React.ComponentRef<typeof OrbitControls> | null>(null);
  const crownRef = useRef<THREE.Group | null>(null);
  const coinRef = useRef<THREE.Group | null>(null);
  const ringRefs = useRef<(THREE.Mesh | null)[]>([]);
  const ringMatRefs = useRef<(THREE.MeshStandardMaterial | null)[]>([]);
  const transitioningRef = useRef(false);

  const { camera } = useThree();

  const gridTex = useMemo(() => createPlatformGridTexture(), []);

  const crownGeo = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(-0.5, -0.28);
    shape.lineTo(-0.38, 0.24);
    shape.lineTo(-0.15, -0.02);
    shape.lineTo(0, 0.38);
    shape.lineTo(0.15, -0.02);
    shape.lineTo(0.38, 0.24);
    shape.lineTo(0.5, -0.28);
    shape.closePath();

    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.1,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.02,
      bevelThickness: 0.02,
    });
    geo.center();
    return geo;
  }, []);

  useEffect(() => {
    return () => {
      gridTex.dispose();
      crownGeo.dispose();
    };
  }, [gridTex, crownGeo]);

  useEffect(() => {
    transitioningRef.current = true;
  }, [cameraPreset, presetVersion]);

  useEffect(() => {
    if (turnVersion === 0 || !controlsRef.current) return;
    transitioningRef.current = false;
    const target = controlsRef.current.target;
    _offsetVec.copy(camera.position).sub(target);
    _offsetVec.applyAxisAngle(_yAxis, turnDirection * (Math.PI / 4));
    camera.position.copy(target).add(_offsetVec);
    controlsRef.current.update();
  }, [turnVersion, turnDirection, camera]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    const elapsed = state.clock.getElapsedTime();

    // Floating Crown above center
    if (crownRef.current) {
      crownRef.current.position.y = 2.05 + Math.sin(elapsed * 1.6) * 0.06;
      crownRef.current.rotation.y = Math.sin(elapsed * 0.7) * 0.35;
    }

    // Center Coin Disc subtle spin
    if (coinRef.current) {
      coinRef.current.rotation.y += dt * 0.45;
    }

    // Five rising scan rings (light up red -> white as stages complete)
    for (let i = 0; i < 5; i++) {
      const stageNum = i + 1;
      const mesh = ringRefs.current[i];
      const mat = ringMatRefs.current[i];
      const isDone = stageNum <= completedStages;
      const isActive = stageNum === activeStage && !isDone;

      if (mesh) {
        const targetY = isDone ? 0.36 + i * 0.22 : isActive ? 0.28 + i * 0.18 : 0.08 + i * 0.03;
        mesh.position.y = THREE.MathUtils.damp(mesh.position.y, targetY, 6, dt);
      }

      if (mat) {
        if (isDone) {
          _ringColor.copy(_whiteColor);
          mat.emissive.lerp(_whiteColor, 1 - Math.exp(-6 * dt));
          mat.emissiveIntensity = THREE.MathUtils.damp(mat.emissiveIntensity, 0.75, 6, dt);
        } else if (isActive) {
          _ringColor.copy(_redColor);
          mat.emissive.lerp(_redColor, 1 - Math.exp(-6 * dt));
          mat.emissiveIntensity = THREE.MathUtils.damp(mat.emissiveIntensity, 0.95, 6, dt);
        } else {
          _ringColor.copy(_dimColor);
          mat.emissive.lerp(_redColor, 1 - Math.exp(-4 * dt));
          mat.emissiveIntensity = THREE.MathUtils.damp(mat.emissiveIntensity, 0.08, 6, dt);
        }
        mat.color.lerp(_ringColor, 1 - Math.exp(-6 * dt));
      }
    }

    // Damped camera preset transitions
    if (transitioningRef.current && controlsRef.current) {
      if (cameraPreset === 'overview') {
        _camTarget.set(4.3, 3.2, 4.9);
        _lookTarget.set(0, 0.95, 0);
      } else if (cameraPreset === 'core') {
        _camTarget.set(2.4, 1.5, 2.7);
        _lookTarget.set(0, 0.9, 0);
      } else {
        _camTarget.set(0.01, 6.0, 1.2);
        _lookTarget.set(0, 0.7, 0);
      }
      const alpha = 1 - Math.exp(-5 * dt);
      camera.position.lerp(_camTarget, alpha);
      controlsRef.current.target.lerp(_lookTarget, alpha);
      if (camera.position.distanceTo(_camTarget) < 0.05) {
        transitioningRef.current = false;
      }
    }
  });

  const ringRadii = [1.05, 1.32, 1.59, 1.86, 2.13];

  return (
    <>
      <color attach="background" args={['#050505']} />
      <fogExp2 attach="fog" args={['#050505', 0.045]} />

      {/* Studio 3-point warm/cool lighting */}
      <hemisphereLight args={['#8a9bb5', '#1a0505', 0.85]} />
      <directionalLight position={[5, 8, 5]} intensity={2.2} color="#fff2e2" castShadow />
      <directionalLight position={[-5, 4, -5]} intensity={1.7} color="#E10000" />
      <pointLight position={[0, 2.5, 0]} intensity={1.4} color="#E10000" distance={6} />

      {/* Dark Circular Platform with Red Grid Lines & 3D Cardinal Direction Ticks */}
      <group position={[0, 0, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
          <circleGeometry args={[3.4, 64]} />
          <meshStandardMaterial map={gridTex} roughness={0.82} metalness={0.2} />
        </mesh>
        <mesh position={[0, -0.08, 0]}>
          <cylinderGeometry args={[3.42, 3.55, 0.14, 64]} />
          <meshStandardMaterial color="#0E0E0E" roughness={0.75} metalness={0.25} />
        </mesh>
        {/* 4 Cardinal Directional Orientation Beacons around Platform Rim */}
        {[0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].map((angle, idx) => (
          <group key={angle} rotation={[0, angle, 0]}>
            <mesh position={[0, 0.05, 3.35]}>
              <boxGeometry args={[idx === 0 ? 0.22 : 0.12, 0.08, 0.36]} />
              <meshStandardMaterial
                color={idx === 0 ? '#E10000' : '#FFFFFF'}
                emissive={idx === 0 ? '#E10000' : '#FFFFFF'}
                emissiveIntensity={idx === 0 ? 0.9 : 0.25}
                roughness={0.3}
                metalness={0.6}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Clean Central Coin Disc */}
      <group ref={coinRef} position={[0, 0.34, 0]}>
        <mesh castShadow receiveShadow>
          <cylinderGeometry args={[0.68, 0.68, 0.12, 48]} />
          <meshStandardMaterial color="#F2F2F2" roughness={0.32} metalness={0.85} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.065, 0]}>
          <torusGeometry args={[0.56, 0.025, 12, 48]} />
          <meshStandardMaterial
            color="#E10000"
            emissive="#E10000"
            emissiveIntensity={0.65}
            roughness={0.25}
            metalness={0.6}
          />
        </mesh>
      </group>

      {/* 5 Rising Scan Rings / Gates */}
      {ringRadii.map((radius, idx) => (
        <mesh
          key={radius}
          ref={(el) => {
            ringRefs.current[idx] = el;
          }}
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, 0.08 + idx * 0.03, 0]}
        >
          <torusGeometry args={[radius, 0.032, 16, 72]} />
          <meshStandardMaterial
            ref={(el) => {
              ringMatRefs.current[idx] = el;
            }}
            color="#2A2A2A"
            emissive="#E10000"
            emissiveIntensity={0.08}
            roughness={0.28}
            metalness={0.75}
          />
        </mesh>
      ))}

      {/* Floating Neon-Red Crown */}
      <group ref={crownRef} position={[0, 2.05, 0]}>
        <mesh geometry={crownGeo} castShadow>
          <meshStandardMaterial
            color="#E10000"
            emissive="#E10000"
            emissiveIntensity={0.85}
            roughness={0.2}
            metalness={0.65}
          />
        </mesh>
      </group>

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        autoRotate={autoOrbit}
        autoRotateSpeed={1.2}
        minDistance={2.6}
        maxDistance={10}
        maxPolarAngle={Math.PI * 0.48}
        onStart={() => {
          transitioningRef.current = false;
        }}
      />
    </>
  );
};

export const LabScanner3D: React.FC<LabScanner3DProps> = (props) => {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
      camera={{ position: [4.3, 3.2, 4.9], fov: 42, near: 0.1, far: 60 }}
      onCreated={({ gl }) => {
        const canvas = gl.domElement;
        canvas.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
        });
      }}
      className="w-full h-full"
    >
      <ScannerSceneContent {...props} />
    </Canvas>
  );
};

export default LabScanner3D;
