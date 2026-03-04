import type React from 'react';
import { Waves, X } from 'lucide-react';

interface CatastropheModalProps {
  show: boolean;
  onClose: () => void;
  form: { name: string; type: string; status: string; centerLat: string; centerLng: string };
  setForm: (f: (prev: any) => any) => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
}

export const CatastropheModal: React.FC<CatastropheModalProps> = ({
  show, onClose, form, setForm, onSubmit, saving
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
        <div className="p-4 border-b border-slate-700 flex items-start justify-between">
          <div><h3 className="text-lg font-bold text-white flex items-center gap-2"><Waves className="w-5 h-5 text-cyan-400" /> Iniciar monitoramento de catástrofe</h3></div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form className="p-4 space-y-3" onSubmit={onSubmit}>
          <input required value={form.name} onChange={(e) => setForm((prev: any) => ({ ...prev, name: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Nome da catástrofe (ex: Enchente Ubá Jan/2024)" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select value={form.type} onChange={(e) => setForm((prev: any) => ({ ...prev, type: e.target.value as any }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm">
              <option value="Enchente">Enchente</option>
              <option value="Deslizamento">Deslizamento</option>
              <option value="Desabamento">Desabamento</option>
              <option value="Corrente d'água">Corrente d'água</option>
            </select>
            <select value={form.status} onChange={(e) => setForm((prev: any) => ({ ...prev, status: e.target.value as any }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm">
              <option value="Ativa">Ativa</option>
              <option value="Monitorada">Monitorada</option>
              <option value="Encerrada">Encerrada</option>
            </select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input required value={form.centerLat} onChange={(e) => setForm((prev: any) => ({ ...prev, centerLat: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Latitude central" />
            <input required value={form.centerLng} onChange={(e) => setForm((prev: any) => ({ ...prev, centerLng: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Longitude central" />
          </div>
          <div className="flex justify-end gap-2 text-xs text-slate-400 mb-2">
            * Use o clique no mapa para preencher coordenadas automaticamente se necessário.
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 text-sm rounded border border-slate-600 text-slate-300 hover:text-white">Cancelar</button>
            <button type="submit" disabled={saving} className="px-3 py-2 text-sm rounded bg-cyan-600 text-white font-semibold hover:bg-cyan-500 disabled:opacity-70">{saving ? 'Salvando...' : 'Criar Monitoramento'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
