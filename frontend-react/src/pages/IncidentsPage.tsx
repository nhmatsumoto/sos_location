import { useState } from 'react';
import { UploadDropzone } from '../components/ui/UploadDropzone';
import { TextAreaInput, TextInput } from '../components/ui/Field';
import { incidentsApi } from '../services/incidentsApi';

export function IncidentsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({ locationName: 'Ubá', latitude: '-21.1215', longitude: '-42.9427', description: '', reporterName: '', reporterPhone: '' });

  const onUpload = async () => {
    if (!file) return;
    setUploading(true);
    setStatus('');
    try {
      const response = await incidentsApi.uploadCollapseReport({
        video: file,
        locationName: form.locationName,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        description: form.description,
        reporterName: form.reporterName,
        reporterPhone: form.reporterPhone,
      });
      setStatus(`Upload concluído: ${response.id}`);
      setFile(null);
    } catch {
      setStatus('Falha no upload. Verifique os campos e o backend.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-700/60 bg-slate-900/70 p-4">
      <h2 className="text-lg font-semibold text-slate-100">Ocorrências / Upload de evidências</h2>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <TextInput value={form.locationName} onChange={(e) => setForm((p) => ({ ...p, locationName: e.target.value }))} placeholder="Local" />
        <TextInput value={form.reporterName} onChange={(e) => setForm((p) => ({ ...p, reporterName: e.target.value }))} placeholder="Nome do repórter" />
        <TextInput value={form.latitude} onChange={(e) => setForm((p) => ({ ...p, latitude: e.target.value }))} placeholder="Latitude" />
        <TextInput value={form.longitude} onChange={(e) => setForm((p) => ({ ...p, longitude: e.target.value }))} placeholder="Longitude" />
        <TextInput value={form.reporterPhone} onChange={(e) => setForm((p) => ({ ...p, reporterPhone: e.target.value }))} placeholder="Telefone" />
        <TextAreaInput value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="Descrição" />
      </div>

      <UploadDropzone file={file} onSelectFile={setFile} onUpload={() => void onUpload()} uploading={uploading} />
      {status && <p className="text-xs text-slate-300">{status}</p>}
    </div>
  );
}
