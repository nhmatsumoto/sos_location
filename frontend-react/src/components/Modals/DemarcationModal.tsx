import React from 'react';
import { X, MapPin, Tag } from 'lucide-react';

interface DemarcationModalProps {
  show: boolean;
  onClose: () => void;
  draftPoint: { lat: number; lng: number } | null;
  form: {
    title: string;
    description: string;
    type: string;
    tags: string;
  };
  setForm: (f: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  error: string;
  success: string;
}

export const DemarcationModal: React.FC<DemarcationModalProps> = ({
  show, onClose, draftPoint, form, setForm, onSubmit, saving, error, success
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-5000 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <MapPin className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Nova Demarcação Admin</h2>
              <p className="text-xs text-slate-400">Ponto de interesse operacional no mapa</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tipo de Ponto</label>
              <select
                value={form.type}
                onChange={(e) => setForm((prev: any) => ({ ...prev, type: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:border-blue-500 outline-none transition-all"
              >
                <option value="Ponto de Apoio">Ponto de Apoio</option>
                <option value="Logística">Logística / Alimento</option>
                <option value="Bloqueio">Bloqueio / Acesso</option>
                <option value="Saúde">Posto de Saúde</option>
                <option value="Comunicações">Torre de Comunicação</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Título</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev: any) => ({ ...prev, title: e.target.value }))}
                placeholder="Ex: Centro de Distribuição"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all"
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Descrição Detalhada</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((prev: any) => ({ ...prev, description: e.target.value }))}
              placeholder="Descreva a finalidade deste ponto ou observações importantes..."
              className="w-full min-h-[100px] bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all resize-none"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Tag className="w-3 h-3" /> Tags (separadas por vírgula)
            </label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm((prev: any) => ({ ...prev, tags: e.target.value }))}
              placeholder="Ex: urgente, água, medicamentos"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all"
            />
          </div>

          {draftPoint && (
            <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">
                COORD: {draftPoint.lat.toFixed(5)}, {draftPoint.lng.toFixed(5)}
              </span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold uppercase">
                Localização Capturada
              </span>
            </div>
          )}

          {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-lg">{error}</p>}
          {success && <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg">{success}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-slate-700 text-sm font-bold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-sm font-bold text-white shadow-lg shadow-blue-900/20 transition-all"
            >
              {saving ? 'Gravando...' : 'Salvar Demarcação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
