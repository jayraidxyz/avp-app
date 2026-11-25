import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Maximize2, Minimize2, RotateCcw } from 'lucide-react';

interface Solana3DSceneProps {
  activeStep: number; // 1, 2, or 3
  onSelectStep?: (step: number) => void;
}

// Pre-allocated scratch helpers outside render loop (Zero GC)
const _dummy = new THREE.Object3D();
const _vec3 = new THREE.Vector3();
const _targetCamPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function createProceduralGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#070707';
    ctx.fillRect(0, 0, size, size);

    // Subtle red radial glow
    const grad = ctx.createRadialGradient(size / 2, size / 2, 20, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(225, 0, 0, 0.16)');
    grad.addColorStop(1, 'rgba(5, 5, 5, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Precision grid lines
    ctx.strokeStyle = 'rgba(225, 0, 0, 0.22)';
    ctx.lineWidth = 1.5;
    const step = 32;
    for (let i = 0; i <= size; i += step) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }

    // Concentric validator rings
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    [96, 168, 232].forEach((r) => {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
      ctx.stroke();
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(size / 2, size / 2, 10, size / 2, size / 2, size / 2);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
    grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.4)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export const Solana3DScene: React.FC<Solana3DSceneProps> = ({ activeStep, onSelectStep }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [explodeFactor, setExplodeFactor] = useState(0.35);
  const [cameraPreset, setCameraPreset] = useState<'overview' | 'core' | 'top'>('overview');
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [contextLost, setContextLost] = useState(false);

  // Mutable refs for zero-teardown React -> Three.js synchronization
  const explodeTargetRef = useRef(0.35);
  const activeStepRef = useRef(activeStep);
  const presetTriggerRef = useRef<{ active: boolean; preset: 'overview' | 'core' | 'top' }>({
    active: false,
    preset: 'overview',
  });

  useEffect(() => {
    explodeTargetRef.current = explodeFactor;
  }, [explodeFactor]);

  useEffect(() => {
    activeStepRef.current = activeStep;
  }, [activeStep]);

  const applyCameraPreset = (preset: 'overview' | 'core' | 'top') => {
    setCameraPreset(preset);
    presetTriggerRef.current = { active: true, preset };
  };

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareWebGL();
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050505);
    scene.fog = new THREE.FogExp2(0x050505, 0.042);

    const width = container.clientWidth || 640;
    const height = container.clientHeight || 460;

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(4.8, 3.6, 5.4);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const domEl = renderer.domElement;
    domEl.style.display = 'block';
    domEl.style.width = '100%';
    domEl.style.height = '100%';
    container.appendChild(domEl);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    domEl.addEventListener('webglcontextlost', handleContextLost);
    domEl.addEventListener('webglcontextrestored', handleContextRestored);

    // Mandatory studio environment map via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;
    pmremGenerator.dispose();

    // 3-Point Warm/Cool Studio Lighting
    const hemiLight = new THREE.HemisphereLight(0x8899b8, 0x160505, 0.75);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xfff1e0, 2.2);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.set(1024, 1024);
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 22;
    const d = 4.5;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xe10000, 1.8);
    rimLight.position.set(-5, 4, -5);
    scene.add(rimLight);

    // OrbitControls with exponential damping
    const controls = new OrbitControls(camera, domEl);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.06;
    controls.minDistance = 3.2;
    controls.maxDistance = 12;
    controls.maxPolarAngle = Math.PI * 0.48;
    controls.target.set(0, 1.25, 0);

    controls.addEventListener('start', () => {
      presetTriggerRef.current.active = false;
    });

    // Procedural Textures & Materials
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const gridTex = createProceduralGridTexture(maxAniso);
    const shadowTex = createContactShadowTexture();

    const disposables: Array<{ dispose: () => void }> = [envTexture, gridTex, shadowTex];

    const matObsidian = new THREE.MeshStandardMaterial({
      color: 0x0e0e0e,
      roughness: 0.78,
      metalness: 0.22,
    });
    const matBrushedMetal = new THREE.MeshPhysicalMaterial({
      color: 0x262626,
      roughness: 0.22,
      metalness: 0.9,
      clearcoat: 0.4,
      clearcoatRoughness: 0.2,
    });
    const matWhiteClay = new THREE.MeshStandardMaterial({
      color: 0xf2f2f2,
      roughness: 0.48,
      metalness: 0.05,
    });
    const matNeonRed = new THREE.MeshStandardMaterial({
      color: 0xe10000,
      emissive: 0xe10000,
      emissiveIntensity: 0.75,
      roughness: 0.2,
      metalness: 0.6,
    });
    const matFloor = new THREE.MeshStandardMaterial({
      map: gridTex,
      roughness: 0.85,
      metalness: 0.15,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    const matContactShadow = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.75,
    });
    disposables.push(
      matObsidian,
      matBrushedMetal,
      matWhiteClay,
      matNeonRed,
      matFloor,
      matContactShadow,
    );

    // Ground disc
    const floorGeo = new THREE.CircleGeometry(9, 64);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeo, matFloor);
    floorMesh.position.y = 0;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);
    disposables.push(floorGeo);

    // Contact shadow plane directly under reactor
    const shadowPlaneGeo = new THREE.PlaneGeometry(4.2, 4.2);
    shadowPlaneGeo.rotateX(-Math.PI / 2);
    const shadowPlane = new THREE.Mesh(shadowPlaneGeo, matContactShadow);
    shadowPlane.position.y = 0.02;
    scene.add(shadowPlane);
    disposables.push(shadowPlaneGeo);

    // --- Composite Multi-Part Hero Model: Toxicology PoH Reactor ---
    const reactorRoot = new THREE.Group();
    scene.add(reactorRoot);

    // 1. Grounded Stepped Plinth (LatheGeometry, pivoted at y = 0)
    const plinthPoints = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(1.75, 0),
      new THREE.Vector2(1.75, 0.14),
      new THREE.Vector2(1.52, 0.24),
      new THREE.Vector2(1.48, 0.36),
      new THREE.Vector2(1.18, 0.42),
      new THREE.Vector2(0, 0.42),
    ];
    const plinthGeo = new THREE.LatheGeometry(plinthPoints, 48);
    const plinthMesh = new THREE.Mesh(plinthGeo, matObsidian);
    plinthMesh.castShadow = true;
    plinthMesh.receiveShadow = true;
    reactorRoot.add(plinthMesh);
    disposables.push(plinthGeo);

    // Layer 1: Incentives Stator Ring + Red Conduits
    const layer1Group = new THREE.Group();
    layer1Group.position.y = 0.55;
    reactorRoot.add(layer1Group);

    const ringShape = new THREE.Shape();
    ringShape.absarc(0, 0, 1.32, 0, Math.PI * 2, false);
    const ringHole = new THREE.Path();
    ringHole.absarc(0, 0, 0.92, 0, Math.PI * 2, true);
    ringShape.holes.push(ringHole);

    const statorGeo = new THREE.ExtrudeGeometry(ringShape, {
      depth: 0.18,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.04,
      bevelThickness: 0.04,
    });
    statorGeo.rotateX(-Math.PI / 2);
    const statorMesh = new THREE.Mesh(statorGeo, matBrushedMetal);
    statorMesh.castShadow = true;
    statorMesh.receiveShadow = true;
    layer1Group.add(statorMesh);
    disposables.push(statorGeo);

    // 4 Red Energy Conduits around Stator
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(angle) * 1.38, 0.05, Math.sin(angle) * 1.38),
        new THREE.Vector3(Math.cos(angle + 0.25) * 1.46, 0.14, Math.sin(angle + 0.25) * 1.46),
        new THREE.Vector3(Math.cos(angle + 0.5) * 1.34, 0.1, Math.sin(angle + 0.5) * 1.34),
      ]);
      const conduitGeo = new THREE.TubeGeometry(curve, 16, 0.032, 8, false);
      const conduitMesh = new THREE.Mesh(conduitGeo, matNeonRed);
      layer1Group.add(conduitMesh);
      disposables.push(conduitGeo);
    }

    // Layer 2: PoH Clock Core & Sealevel Blades + Instanced Transaction Shards
    const layer2Group = new THREE.Group();
    layer2Group.position.y = 1.25;
    reactorRoot.add(layer2Group);

    const coreGeo = new THREE.CylinderGeometry(0.46, 0.54, 0.86, 32);
    const coreMesh = new THREE.Mesh(coreGeo, matWhiteClay);
    coreMesh.castShadow = true;
    coreMesh.receiveShadow = true;
    layer2Group.add(coreMesh);
    disposables.push(coreGeo);

    const coreBandGeo = new THREE.TorusGeometry(0.52, 0.045, 16, 48);
    coreBandGeo.rotateX(Math.PI / 2);
    const coreBand = new THREE.Mesh(coreBandGeo, matNeonRed);
    layer2Group.add(coreBand);
    disposables.push(coreBandGeo);

    // 6 Turbine Parallel-Execution Fins
    const finShape = new THREE.Shape();
    finShape.moveTo(0, -0.32);
    finShape.lineTo(0.36, -0.22);
    finShape.lineTo(0.42, 0.22);
    finShape.lineTo(0, 0.32);
    finShape.closePath();

    const finGeo = new THREE.ExtrudeGeometry(finShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.015,
      bevelThickness: 0.015,
    });
    finGeo.translate(0.45, 0, -0.03);
    disposables.push(finGeo);

    for (let i = 0; i < 6; i++) {
      const fin = new THREE.Mesh(finGeo, matBrushedMetal);
      fin.rotation.y = (i * Math.PI * 2) / 6;
      fin.castShadow = true;
      layer2Group.add(fin);
    }

    // InstancedMesh of 36 Transaction Load Shards
    const shardCount = 36;
    const shardGeo = new THREE.BoxGeometry(0.11, 0.11, 0.22);
    const shardMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.3,
      metalness: 0.75,
    });
    const shardInstanced = new THREE.InstancedMesh(shardGeo, shardMat, shardCount);
    shardInstanced.frustumCulled = false;

    const cRed = new THREE.Color(0xe10000);
    const cSilver = new THREE.Color(0xd4d4d4);
    for (let i = 0; i < shardCount; i++) {
      const a = (i / shardCount) * Math.PI * 2;
      const r = 1.65 + (i % 3) * 0.14;
      _dummy.position.set(Math.cos(a) * r, ((i % 5) - 2) * 0.08, Math.sin(a) * r);
      _dummy.rotation.set(0, -a, 0);
      _dummy.scale.setScalar(0.85 + (i % 3) * 0.15);
      _dummy.updateMatrix();
      shardInstanced.setMatrixAt(i, _dummy.matrix);
      shardInstanced.setColorAt(i, i % 3 === 0 ? cRed : cSilver);
    }
    shardInstanced.instanceMatrix.needsUpdate = true;
    if (shardInstanced.instanceColor) shardInstanced.instanceColor.needsUpdate = true;
    shardInstanced.computeBoundingSphere();
    layer2Group.add(shardInstanced);
    disposables.push(shardGeo, shardMat);

    // Layer 3: Neon-Red Toxicology Crown Beacon
    const layer3Group = new THREE.Group();
    layer3Group.position.y = 2.25;
    reactorRoot.add(layer3Group);

    const crownShape = new THREE.Shape();
    crownShape.moveTo(-0.55, -0.32);
    crownShape.lineTo(-0.42, 0.26);
    crownShape.lineTo(-0.16, -0.02);
    crownShape.lineTo(0, 0.42);
    crownShape.lineTo(0.16, -0.02);
    crownShape.lineTo(0.42, 0.26);
    crownShape.lineTo(0.55, -0.32);
    crownShape.closePath();

    const crownGeo = new THREE.ExtrudeGeometry(crownShape, {
      depth: 0.12,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.025,
      bevelThickness: 0.025,
    });
    crownGeo.center();
    const crownMesh = new THREE.Mesh(crownGeo, matNeonRed);
    crownMesh.castShadow = true;
    layer3Group.add(crownMesh);
    disposables.push(crownGeo);

    // Pre-warm shaders on hardware GPU
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // ResizeObserver for crisp responsive sizing
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w <= 0 || h <= 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Animation loop with Software WebGL pacing
    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();
    let currentExplode = explodeTargetRef.current;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.getElapsedTime();

      // Smooth exponential damping for exploded layer spacing
      currentExplode = THREE.MathUtils.damp(currentExplode, explodeTargetRef.current, 6, dt);
      const stepBoost = activeStepRef.current === 2 ? 0.15 : 0;

      layer1Group.position.y = 0.55 + currentExplode * 0.25;
      layer2Group.position.y = 1.25 + currentExplode * 0.75 + stepBoost;
      layer3Group.position.y = 2.22 + currentExplode * 1.25;

      if (!prefersReducedMotion) {
        layer2Group.rotation.y += dt * (activeStepRef.current === 2 ? 0.95 : 0.45);
        layer3Group.rotation.y = Math.sin(elapsed * 0.8) * 0.35;
        layer3Group.position.y += Math.sin(elapsed * 1.8) * 0.04;
      }

      // Smoothly interpolate camera presets until arrival or user drag
      if (presetTriggerRef.current.active) {
        const p = presetTriggerRef.current.preset;
        if (p === 'overview') {
          _targetCamPos.set(4.8, 3.6, 5.4);
          _targetLook.set(0, 1.3, 0);
        } else if (p === 'core') {
          _targetCamPos.set(2.9, 1.8, 3.1);
          _targetLook.set(0, 1.4, 0);
        } else {
          _targetCamPos.set(0.01, 6.2, 1.4);
          _targetLook.set(0, 1.1, 0);
        }

        const alpha = 1 - Math.exp(-5 * dt);
        camera.position.lerp(_targetCamPos, alpha);
        controls.target.lerp(_targetLook, alpha);

        if (camera.position.distanceTo(_targetCamPos) < 0.04) {
          presetTriggerRef.current.active = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      domEl.removeEventListener('webglcontextlost', handleContextLost);
      domEl.removeEventListener('webglcontextrestored', handleContextRestored);
      controls.dispose();
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      if (domEl.parentNode === container) {
        container.removeChild(domEl);
      }
    };
  }, []);

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#050505]'
          : 'relative w-full h-[420px] sm:h-[500px] lg:h-[560px] rounded-[20px] overflow-hidden border-[1.5px] border-[#2A2A2A] bg-[#050505]'
      }
    >
      {/* Isolated WebGL Mount Container */}
      <div ref={mountRef} className="w-full h-full" aria-label="Interactive 3D Solana 1.0 Validator Architecture" />

      {contextLost && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#050505]/95 p-6 text-center">
          <p className="text-sm text-[#A3A3A3]">
            3D WebGL context paused by browser. Tap reset or reload to restore view.
          </p>
        </div>
      )}

      {/* Top Minimal Spec Badge (Solid surface, zero backdrop-filter over WebGL) */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
        <div className="pointer-events-auto bg-[#0E0E0E]/95 border border-[#2A2A2A] rounded-full px-3.5 py-2 flex items-center gap-2">
          <span className="font-heading font-bold text-xs text-[#FF554A] tabular-nums">
            0{activeStep}
          </span>
          <span className="text-xs font-medium text-white">
            {activeStep === 1
              ? 'Incentives Stator'
              : activeStep === 2
                ? 'PoH Load Core'
                : 'Crown Usage Beacon'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsFullscreen((prev) => !prev)}
          aria-label={isFullscreen ? 'Exit fullscreen 3D view' : 'Expand fullscreen 3D view'}
          className="pointer-events-auto min-h-[44px] min-w-[44px] rounded-full bg-[#0E0E0E]/95 border border-[#2A2A2A] text-white hover:border-[#E10000] flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Collapsible Bottom Control Dock (Solid rgba surface, <= 15% height) */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] max-w-[680px] flex flex-col items-center">
        <button
          type="button"
          onClick={() => setDockCollapsed((prev) => !prev)}
          aria-expanded={!dockCollapsed}
          aria-label={dockCollapsed ? 'Show 3D controls' : 'Hide 3D controls'}
          className="mb-2 min-h-[44px] px-4 rounded-full bg-[#0E0E0E]/95 border border-[#2A2A2A] text-xs font-heading font-bold text-[#A3A3A3] hover:text-white flex items-center gap-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
        >
          {dockCollapsed ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              Show Controls
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              Hide Controls
            </>
          )}
        </button>

        {!dockCollapsed && (
          <div className="w-full bg-[#0E0E0E]/95 border-[1.5px] border-[#2A2A2A] rounded-[20px] px-3 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-[0_8px_24px_rgba(0,0,0,0.75)]">
            {/* Exploded View Slider */}
            <label className="flex items-center gap-2.5 text-xs text-[#A3A3A3] min-h-[44px] px-1">
              <span className="font-heading font-bold text-white whitespace-nowrap">Explode</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={explodeFactor}
                onChange={(e) => setExplodeFactor(Number(e.target.value))}
                aria-label="Exploded view separation"
                className="w-20 sm:w-28 accent-[#E10000] cursor-pointer"
              />
            </label>

            {/* Layer Focus Step Buttons */}
            {onSelectStep && (
              <div className="flex items-center gap-1.5">
                {[1, 2, 3].map((step) => (
                  <button
                    key={step}
                    type="button"
                    onClick={() => onSelectStep(step)}
                    className={`min-h-[44px] min-w-[44px] px-3 rounded-full text-xs font-heading font-bold tabular-nums transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] ${
                      activeStep === step
                        ? 'bg-[#E10000] text-white'
                        : 'bg-[#161616] text-[#A3A3A3] hover:text-white border border-[#2A2A2A]'
                    }`}
                  >
                    0{step}
                  </button>
                ))}
              </div>
            )}

            {/* Camera View Presets */}
            <div className="flex items-center gap-1.5">
              {(['overview', 'core', 'top'] as const).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyCameraPreset(preset)}
                  className={`min-h-[44px] px-3 rounded-full text-xs font-heading font-bold capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A] ${
                    cameraPreset === preset
                      ? 'bg-white text-[#050505]'
                      : 'bg-[#161616] text-[#A3A3A3] hover:text-white border border-[#2A2A2A]'
                  }`}
                >
                  {preset}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setExplodeFactor(0.35);
                  applyCameraPreset('overview');
                }}
                aria-label="Reset 3D camera and exploded view"
                className="min-h-[44px] min-w-[44px] rounded-full bg-[#161616] border border-[#2A2A2A] text-[#A3A3A3] hover:text-white flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF554A]"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
