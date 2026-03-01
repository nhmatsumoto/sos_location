import { UploadDropzone } from '../components/ui/UploadDropzone';

export function IncidentsPage() {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
      <h2 className="text-lg font-semibold text-slate-100">Ocorrências / Upload de evidências</h2>
      <UploadDropzone />
    </div>
  );
}
