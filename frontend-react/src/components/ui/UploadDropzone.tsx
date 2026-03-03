import { useMemo } from 'react';
import { Button } from './Button';

interface UploadDropzoneProps {
  file: File | null;
  onSelectFile: (file: File | null) => void;
  onUpload: () => void;
  uploading?: boolean;
}

export function UploadDropzone({ file, onSelectFile, onUpload, uploading = false }: UploadDropzoneProps) {
  const fileLabel = useMemo(() => {
    if (!file) return 'Nenhum arquivo selecionado';
    return `${file.name} (${Math.round(file.size / 1024 / 1024)} MB)`;
  }, [file]);

  return (
    <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/60 p-6 text-center">
      <p className="text-sm font-semibold text-slate-100">Arraste vídeos/fotos aqui</p>
      <p className="mt-1 text-xs text-slate-300">Formatos aceitos: MP4, MOV, JPG, PNG · tamanho máx. 2GB</p>

      <input
        type="file"
        accept="video/*,image/*"
        className="mx-auto mt-4 block text-xs"
        onChange={(event) => onSelectFile(event.target.files?.[0] ?? null)}
      />

      <p className="mt-3 text-xs text-slate-300">{fileLabel}</p>

      <Button type="button" className="mt-3" onClick={onUpload} disabled={!file || uploading}>
        {uploading ? 'Enviando...' : 'Enviar evidência'}
      </Button>
    </div>
  );
}
