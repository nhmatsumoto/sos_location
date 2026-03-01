export function UploadDropzone() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-600 bg-slate-900/60 p-6 text-center">
      <p className="text-sm font-semibold text-slate-100">Arraste vídeos/fotos aqui</p>
      <p className="mt-1 text-xs text-slate-300">Formatos aceitos: MP4, MOV, JPG, PNG · tamanho máx. 2GB</p>
      <button type="button" className="mt-3 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900">
        Selecionar arquivos
      </button>
      <div className="mt-4 grid grid-cols-1 gap-2 text-left text-xs text-slate-200 md:grid-cols-2">
        <p>• fila_ingestao_001.mp4 — recebido</p>
        <p>• camera-campo-22.mov — processando 64%</p>
        <p>• drone-setor-leste.mp4 — concluído</p>
        <p>• relato-noturno.mp4 — erro (retry disponível)</p>
      </div>
    </div>
  );
}
