import type React from 'react';
import { Siren, X } from 'lucide-react';

interface RiskAreaModalProps {
  show: boolean;
  onClose: () => void;
  riskDraftPoint: { lat: number, lng: number } | null;
  form: { title: string; message: string; severity: string; radiusMeters: string; addMissingPerson: boolean; personName: string; city: string; contactName: string; contactPhone: string };
  setForm: (f: (prev: any) => any) => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  error: string;
  success: string;
}

export const RiskAreaModal: React.FC<RiskAreaModalProps> = ({
  show, onClose, riskDraftPoint, form, setForm, onSubmit, saving, error, success
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
        <div className="p-4 border-b border-slate-700 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2"><Siren className="w-5 h-5 text-rose-400" /> Marcar área de risco</h3>
            {riskDraftPoint && <p className="text-xs text-slate-400 mt-1">Coordenadas: {riskDraftPoint.lat.toFixed(5)}, {riskDraftPoint.lng.toFixed(5)}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form className="p-4 space-y-3" onSubmit={onSubmit}>
          <input required value={form.title} onChange={(e) => setForm((prev: any) => ({ ...prev, title: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Título do alerta" />
          <textarea required value={form.message} onChange={(e) => setForm((prev: any) => ({ ...prev, message: e.target.value }))} className="w-full min-h-20 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Descrição do risco" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <select value={form.severity} onChange={(e) => setForm((prev: any) => ({ ...prev, severity: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm">
              <option value="medium">Médio</option>
              <option value="high">Alto</option>
              <option value="critical">Crítico</option>
            </select>
            <input value={form.radiusMeters} onChange={(e) => setForm((prev: any) => ({ ...prev, radiusMeters: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Raio (m)" />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input type="checkbox" checked={form.addMissingPerson} onChange={(e) => setForm((prev: any) => ({ ...prev, addMissingPerson: e.target.checked }))} />
            Também cadastrar pessoa desaparecida neste ponto
          </label>

          {form.addMissingPerson && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input value={form.personName} onChange={(e) => setForm((prev: any) => ({ ...prev, personName: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Nome da pessoa" />
              <select value={form.city} onChange={(e) => setForm((prev: any) => ({ ...prev, city: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"><option>Ubá</option><option>Juiz de Fora</option><option>Matias Barbosa</option></select>
              <input value={form.contactName} onChange={(e) => setForm((prev: any) => ({ ...prev, contactName: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Nome do contato" />
              <input value={form.contactPhone} onChange={(e) => setForm((prev: any) => ({ ...prev, contactPhone: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Telefone" />
            </div>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
          {success && <p className="text-xs text-emerald-400">{success}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 text-sm rounded border border-slate-600 text-slate-300 hover:text-white">Cancelar</button>
            <button type="submit" disabled={saving} className="px-3 py-2 text-sm rounded bg-rose-600 text-white font-semibold hover:bg-rose-500 disabled:opacity-70">{saving ? 'Salvando...' : 'Salvar área de risco'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
