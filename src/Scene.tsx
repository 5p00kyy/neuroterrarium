import {
  useMemo,
  useRef,
  useLayoutEffect,
  useEffect,
  type ComponentRef,
} from "react";
import {
  Canvas,
  useThree,
  useFrame,
  type ThreeEvent,
} from "@react-three/fiber";
import { OrbitControls, Line } from "@react-three/drei";
import * as THREE from "three";
import { random } from "./sim/network";
import type { Frame, Mode, Tool } from "./sim/experiment";
export const COLORS: Record<Mode, string> = {
  Biological: "#b9d891",
  Adaptive: "#72d7d0",
  Control: "#d6a3df",
};
import { FlyAvatar, Segment as Rod } from "./FlyAvatar";
import { StimulusField } from "./StimulusField";

function RenderBudget() {
  const { gl } = useThree();
  useFrame(() => {
    // Previous completed frame counters, without forcing another render.
    gl.domElement.dataset.drawCalls = String(gl.info.render.calls);
    gl.domElement.dataset.triangles = String(gl.info.render.triangles);
  });
  return null;
}
function Pebbles() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const rng = random(609),
      object = new THREE.Object3D(),
      color = new THREE.Color();
    for (let i = 0; i < 220; i++) {
      const angle = rng() * Math.PI * 2,
        d = Math.sqrt(rng()) * 4.65,
        size = 0.016 + rng() * 0.052;
      object.position.set(Math.cos(angle) * d, 0.003, Math.sin(angle) * d);
      object.scale.set(size, size * 0.45, size * 0.8);
      object.rotation.set(0, i, 0);
      object.updateMatrix();
      mesh.current!.setMatrixAt(i, object.matrix);
      mesh.current!.setColorAt(
        i,
        color.set(rng() > 0.5 ? "#a18b65" : "#4a4233"),
      );
    }
    mesh.current!.instanceMatrix.needsUpdate = true;
    if (mesh.current!.instanceColor)
      mesh.current!.instanceColor.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, 220]} receiveShadow>
      <icosahedronGeometry args={[1, 0]} />
      <meshStandardMaterial roughness={1} />
    </instancedMesh>
  );
}
function CameraRig({
  close,
  frame,
  mode,
}: {
  close: boolean;
  frame: Frame;
  mode: Mode;
}) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null),
    { camera } = useThree();
  const selected = frame.specimens.find((s) => s.mode === mode)!;
  // Mode/camera changes are explicit. No automatic pursuit that fights orbit interaction.
  useEffect(() => {
    const target = new THREE.Vector3(
      close ? selected.x : 0,
      close ? 0.38 : 0,
      close ? selected.z : 0,
    );
    camera.position
      .copy(target)
      .add(
        new THREE.Vector3(
          ...((close ? [2.8, 2.1, 3.6] : [8.2, 8.4, 10.4]) as [
            number,
            number,
            number,
          ]),
        ),
      );
    controls.current?.target.copy(target);
    controls.current?.update();
  }, [close, mode, camera]);
  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={[0, 0, 0]}
      minDistance={2.3}
      maxDistance={19}
      minPolarAngle={0.25}
      maxPolarAngle={1.35}
      enablePan={false}
    />
  );
}
function Plant({
  x,
  z,
  scale = 1,
  angle = 0,
}: {
  x: number;
  z: number;
  scale?: number;
  angle?: number;
}) {
  return (
    <group position={[x, 0, z]} scale={scale} rotation={[0, angle, 0]}>
      <Rod a={[0, 0, 0]} b={[0.05, 0.6, 0]} radius={0.028} color="#64704b" />
      {[0, 1, 2, 3, 4].map((i) => (
        <group
          key={i}
          rotation={[0, i * 2.4, 0]}
          position={[0, 0.1 + i * 0.07, 0]}
        >
          <mesh
            position={[0.2, 0.13, 0]}
            rotation={[0, 0, 0.55]}
            scale={[0.35, 0.065, 0.12]}
            castShadow
          >
            <sphereGeometry args={[1, 12, 8]} />
            <meshStandardMaterial
              color={i % 2 ? "#657652" : "#889069"}
              roughness={0.9}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}
function World({
  frame,
  mode,
  compare,
  onPlace,
  close,
}: {
  frame: Frame;
  mode: Mode;
  compare: boolean;
  close: boolean;
  tool: Tool;
  onPlace: (x: number, z: number) => void;
}) {
  const soil = useMemo(() => {
    const rng = random(944),
      pixels = new Uint8Array(128 * 128 * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      const c = 100 + Math.floor(rng() * 110);
      pixels[i] = c;
      pixels[i + 1] = c;
      pixels[i + 2] = c;
      pixels[i + 3] = 255;
    }
    const t = new THREE.DataTexture(pixels, 128, 128);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(9, 9);
    t.magFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  }, []);
  useEffect(() => () => soil.dispose(), [soil]);
  const selected = frame.specimens.find((s) => s.mode === mode)!;
  function place(e: ThreeEvent<MouseEvent>) {
    if (e.delta > 4) return;
    e.stopPropagation();
    if (Math.hypot(e.point.x, e.point.z) < 4.6) onPlace(e.point.x, e.point.z);
  }
  return (
    <>
      <RenderBudget />
      <color attach="background" args={["#151c19"]} />
      <fog attach="fog" args={["#151c19", 19, 36]} />
      <ambientLight intensity={0.65} />
      <hemisphereLight args={["#cddbd2", "#695339", 1.6]} />
      <directionalLight
        position={[-3, 9, 4]}
        intensity={3.2}
        color="#ffe5b4"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-normalBias={0.025}
      />
      <pointLight position={[4, 4, -3]} color="#a6d9c5" intensity={20} />
      <mesh position={[0, -0.44, 0]} receiveShadow>
        <cylinderGeometry args={[5.02, 4.83, 0.65, 96]} />
        <meshStandardMaterial color="#35362b" roughness={0.9} />
      </mesh>
      <mesh
        position={[0, -0.085, 0]}
        receiveShadow
        onClick={place}
        onPointerOver={() => {
          document.body.style.cursor = "crosshair";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
      >
        <cylinderGeometry args={[4.86, 4.86, 0.12, 96]} />
        <meshStandardMaterial
          color="#8b7451"
          map={soil}
          bumpMap={soil}
          bumpScale={0.07}
          roughness={1}
        />
      </mesh>
      <mesh position={[0, -0.58, 0]}>
        <cylinderGeometry args={[5.06, 5.06, 0.11, 96]} />
        <meshStandardMaterial
          color="#9c977d"
          metalness={0.6}
          roughness={0.35}
        />
      </mesh>
      {[2.5, 4.7, 4.97].map((r, i) => (
        <mesh
          key={r}
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, i === 2 ? 1.25 : 0.005, 0]}
        >
          <ringGeometry args={[r, r + 0.018, 100]} />
          <meshBasicMaterial
            color={i === 2 ? "#a8c0b0" : "#b8ac88"}
            transparent
            opacity={i === 2 ? 0.5 : 0.19}
          />
        </mesh>
      ))}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[4.98, 4.98, 1.3, 96, 1, true]} />
        <meshPhysicalMaterial
          color="#a6cebb"
          transparent
          opacity={0.065}
          side={THREE.DoubleSide}
          roughness={0.1}
          depthWrite={false}
        />
      </mesh>
      <Pebbles />
      {[
        [-3.5, -2.1, 1.4],
        [-3.9, -1.1, 0.8],
        [-2.7, -3, 1],
        [3.5, -1.6, 1.15],
        [3.8, -0.6, 0.7],
        [-2.9, 2.8, 0.65],
      ].map(([x, z, s], i) => (
        <Plant key={i} x={x} z={z} scale={s} angle={i} />
      ))}
      {Array.from({ length: 40 }, (_, i) => {
        const a = (i * Math.PI) / 20;
        return (
          <mesh
            key={i}
            position={[Math.sin(a) * 4.73, 0.008, Math.cos(a) * 4.73]}
            rotation={[-Math.PI / 2, 0, -a]}
          >
            <planeGeometry args={[0.016, i % 5 === 0 ? 0.22 : 0.1]} />
            <meshBasicMaterial color="#cdc29f" transparent opacity={0.5} />
          </mesh>
        );
      })}
      {(compare ? frame.specimens : [selected]).map((s) => (
        <group key={s.mode}>
          {s.path.length > 1 && (
            <Line
              points={s.path.map(([x, z]) => [x, 0.03, z])}
              color={COLORS[s.mode]}
              lineWidth={s.mode === mode ? 1.8 : 1}
              transparent
              opacity={0.65}
            />
          )}
          <FlyAvatar specimen={s} tick={frame.tick} color={COLORS[s.mode]} />
        </group>
      ))}
      {frame.stimuli.map((s) => (
        <StimulusField key={s.tool} stimulus={s} frame={frame} />
      ))}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.68, 0]}
        receiveShadow
      >
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#18201b" roughness={0.9} />
      </mesh>
      <CameraRig close={close} frame={frame} mode={mode} />
    </>
  );
}
export function Scene(props: {
  frame: Frame;
  mode: Mode;
  compare: boolean;
  close: boolean;
  tool: Tool;
  onPlace: (x: number, z: number) => void;
}) {
  return (
    <Canvas
      frameloop="demand"
      shadows
      dpr={[1, 1.6]}
      camera={{ position: [8.2, 8.4, 10.4], fov: 40 }}
      gl={{
        antialias: true,
        preserveDrawingBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
      }}
      fallback={
        <div className="canvas-fallback">
          WebGL is unavailable. Neural simulation and experiment export still
          work.
        </div>
      }
    >
      <World {...props} />
    </Canvas>
  );
}
