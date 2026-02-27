import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Splat } from '@react-three/drei';

interface PostDisasterSplatProps {
  splatUrl?: string | null;
  sourceVideoUrl?: string;
}

const demoSplat = 'https://huggingface.co/datasets/dylanebert/3dgs/resolve/main/bonsai/bonsai-7k.splat';

export default function PostDisasterSplat({ splatUrl, sourceVideoUrl }: PostDisasterSplatProps) {
  const activeSplatUrl = splatUrl ?? demoSplat;

  return (
    <div className="w-full h-full bg-slate-900 overflow-hidden relative rounded-xl border border-slate-700 shadow-inner">
      <div className="absolute top-3 left-3 z-10 bg-slate-800/80 border border-slate-600 px-3 py-1.5 rounded-md text-xs text-white font-semibold backdrop-blur-md shadow-lg flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
        Captura Drone (Gaussian Splatting)
      </div>
      <Canvas camera={{ position: [5, 2, 5], fov: 60 }}>
        <Splat src={activeSplatUrl} position={[0, -1, 0]} scale={[2, 2, 2]} />
        <OrbitControls enableDamping dampingFactor={0.05} minDistance={1} maxDistance={30} autoRotate autoRotateSpeed={0.5} />
        <Environment preset="city" />
      </Canvas>
      <div className="absolute bottom-3 left-3 z-10 text-xs text-slate-400">
        {splatUrl ? 'Splat associado ao upload selecionado.' : 'Demo Splat - Substitua com o arquivo .splat do evento real'}
        {sourceVideoUrl && (
          <div className="mt-1">
            <a className="text-blue-400 hover:text-blue-300 underline" href={sourceVideoUrl} target="_blank" rel="noreferrer">
              Abrir vídeo fonte enviado (Teste.mp4)
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
