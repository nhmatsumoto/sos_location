import type React from 'react';
import { Users, X } from 'lucide-react';

interface MissingPersonModalProps {
  show: boolean;
  onClose: () => void;
  form: { personName: string; age: string; city: string; lastSeenLocation: string; physicalDescription: string; additionalInfo: string; contactName: string; contactPhone: string };
  setForm: (f: (prev: any) => any) => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  error: string;
  success: string;
}

export const MissingPersonModal: React.FC<MissingPersonModalProps> = ({
  show, onClose, form, setForm, onSubmit, saving, error, success
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
        <div className="p-4 border-b border-slate-700 flex items-start justify-between">
          <div><h3 className="text-lg font-bold text-white flex items-center gap-2"><Users className="w-5 h-5 text-amber-400" /> Cadastro de pessoa desaparecida</h3></div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form className="p-4 space-y-3" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input required value={form.personName} onChange={(e) => setForm((prev: any) => ({ ...prev, personName: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Nome da pessoa" />
            <input value={form.age} onChange={(e) => setForm((prev: any) => ({ ...prev, age: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Idade (opcional)" />
            <select value={form.city} onChange={(e) => setForm((prev: any) => ({ ...prev, city: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm"><option>Ubá</option><option>Juiz de Fora</option><option>Matias Barbosa</option></select>
            <input required value={form.lastSeenLocation} onChange={(e) => setForm((prev: any) => ({ ...prev, lastSeenLocation: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Último local visto" />
          </div>
          <textarea value={form.physicalDescription} onChange={(e) => setForm((prev: any) => ({ ...prev, physicalDescription: e.target.value }))} className="w-full min-h-20 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Descrição física" />
          <textarea value={form.additionalInfo} onChange={(e) => setForm((prev: any) => ({ ...prev, additionalInfo: e.target.value }))} className="w-full min-h-16 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Informações adicionais" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input required value={form.contactName} onChange={(e) => setForm((prev: any) => ({ ...prev, contactName: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Nome do contato" />
            <input required value={form.contactPhone} onChange={(e) => setForm((prev: any) => ({ ...prev, contactPhone: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Telefone do contato" />
          </div>
          {error && <p className="text-xs text-red-400">{error}</p>}
          {success && <p className="text-xs text-emerald-400">{success}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 text-sm rounded border border-slate-600 text-slate-300 hover:text-white">Fechar</button>
            <button type="submit" disabled={saving} className="px-3 py-2 text-sm rounded bg-amber-600 text-white font-semibold hover:bg-amber-500 disabled:opacity-70">{saving ? 'Salvando...' : 'Cadastrar'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
