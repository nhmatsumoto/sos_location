import type React from 'react';
import { Smartphone, X } from 'lucide-react';

interface UploadModalProps {
  show: boolean;
  onClose: () => void;
  form: { locationName: string; reporterName: string; latitude: string; longitude: string; description: string; reporterPhone: string; video: File | null };
  setForm: (f: (prev: any) => any) => void;
  onSubmit: (e: React.FormEvent) => void;
  uploading: boolean;
  error: string;
  success: string;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  show, onClose, form, setForm, onSubmit, uploading, error, success
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-700 rounded-xl shadow-2xl">
        <div className="p-4 border-b border-slate-700 flex items-start justify-between">
          <div><h3 className="text-lg font-bold text-white flex items-center gap-2"><Smartphone className="w-5 h-5 text-blue-400" /> Upload de vídeo de desabamento</h3></div>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form className="p-4 space-y-3" onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input required value={form.locationName} onChange={(e) => setForm((prev: any) => ({ ...prev, locationName: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Nome do local" />
            <input value={form.reporterName} onChange={(e) => setForm((prev: any) => ({ ...prev, reporterName: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Seu nome (opcional)" />
            <input required value={form.latitude} onChange={(e) => setForm((prev: any) => ({ ...prev, latitude: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Latitude" />
            <input required value={form.longitude} onChange={(e) => setForm((prev: any) => ({ ...prev, longitude: e.target.value }))} className="bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Longitude" />
          </div>
          <textarea value={form.description} onChange={(e) => setForm((prev: any) => ({ ...prev, description: e.target.value }))} className="w-full min-h-20 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Descreva o desabamento" />
          <input value={form.reporterPhone} onChange={(e) => setForm((prev: any) => ({ ...prev, reporterPhone: e.target.value }))} className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm" placeholder="Contato (opcional)" />
          <input required type="file" accept="video/*" capture="environment" onChange={(e) => setForm((prev: any) => ({ ...prev, video: e.target.files && e.target.files.length > 0 ? e.target.files[0] : null }))} className="text-xs w-full" />
          {error && <p className="text-xs text-red-400">{error}</p>}
          {success && <p className="text-xs text-emerald-400">{success}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 text-sm rounded border border-slate-600 text-slate-300 hover:text-white">Fechar</button>
            <button type="submit" disabled={uploading} className="px-3 py-2 text-sm rounded bg-blue-600 text-white font-semibold hover:bg-blue-500 disabled:opacity-70">{uploading ? 'Enviando...' : 'Enviar para análise'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};
