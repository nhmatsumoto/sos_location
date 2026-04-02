import React, { useState } from 'react';
import { Modal } from './Modal';
import { Box, Ruler, MousePointer2 } from 'lucide-react';

interface SimulationAreaModalProps {
  open: boolean;
  lat: number;
  lon: number;
  onClose: () => void;
  onConfirm: (bounds: [[number, number], [number, number]]) => void;
  onDrawManeally: () => void;
}

export const SimulationAreaModal: React.FC<SimulationAreaModalProps> = ({ 
  open, lat, lon, onClose, onConfirm, onDrawManeally 
}) => {
  const [size, setSize] = useState<number>(500);
  const [unit, setUnit] = useState<'m' | 'km' | 'mi'>('m');

  const handleConfirm = () => {
    let sizeInMeters = size;
    if (unit === 'km') sizeInMeters = size * 1000;
    if (unit === 'mi') sizeInMeters = size * 1609.34;

    // Approximate bounding box based on center and sizeInMeters
    const latDelta = (sizeInMeters / 2) / 111320;
    const lonDelta = (sizeInMeters / 2) / (40075000 * Math.cos(lat * Math.PI / 180) / 360);

    const bounds: [[number, number], [number, number]] = [
      [lat - latDelta, lon - lonDelta],
      [lat + latDelta, lon + lonDelta]
    ];
    onConfirm(bounds);
  };

  return (
    <Modal title="CONFIGURAR ÁREA TÁTICA 3D" open={open} onClose={onClose}>
      <div className="p-4 bg-slate-950 text-slate-200 space-y-6">
        <div className="bg-slate-900 border border-white/5 rounded-xl p-3 flex items-center gap-3">
          <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400">
             <Ruler size={20} />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Ponto de Inserção</span>
            <span className="text-xs font-mono text-slate-300">{lat.toFixed(5)}, {lon.toFixed(5)}</span>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Dimensão da Área Operacional</label>
          <div className="flex gap-2">
            <input 
              type="number" 
              value={size} 
              onChange={e => setSize(Number(e.target.value))}
              className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm font-mono text-cyan-400 outline-none focus:border-cyan-500"
            />
            <select 
              value={unit} 
              onChange={(e) => {
                const nextUnit = e.target.value;
                if (nextUnit === 'm' || nextUnit === 'km' || nextUnit === 'mi') {
                  setUnit(nextUnit);
                }
              }}
              className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm font-mono text-slate-300 outline-none focus:border-cyan-500"
            >
              <option value="m">Metros</option>
              <option value="km">Quilômetros</option>
              <option value="mi">Milhas</option>
            </select>
          </div>
          <div className="text-[10px] text-slate-500 italic">
            Define um raio simulado a partir do ponto central selecionado.
          </div>
        </div>

        <div className="flex flex-col gap-2 pt-4 border-t border-white/10">
          <button 
            onClick={handleConfirm}
            className="w-full flex justify-center items-center gap-2 bg-cyan-600 hover:bg-cyan-500 font-black text-white py-3 rounded-xl text-[11px] uppercase tracking-widest transition-colors shadow-lg shadow-cyan-500/20"
          >
             <Box size={16} /> GERAR DIGITAL TWIN 3D
          </button>
          
          <div className="relative flex py-2 items-center">
             <div className="grow border-t border-white/10"></div>
             <span className="shrink-0 mx-4 text-slate-500 text-[9px] uppercase font-bold tracking-widest">OU</span>
             <div className="grow border-t border-white/10"></div>
          </div>

          <button 
            onClick={onDrawManeally}
            className="w-full flex justify-center items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-white/10 font-bold text-slate-300 py-3 rounded-xl text-[10px] uppercase tracking-widest transition-colors"
          >
             <MousePointer2 size={14} /> DESENHAR ÁREA NO MAPA 2D
          </button>
        </div>
      </div>
    </Modal>
  );
}
