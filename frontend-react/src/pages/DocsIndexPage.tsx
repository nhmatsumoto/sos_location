import { Link } from 'react-router-dom';

const DOCS = [
  {
    category: 'Visão Geral',
    color: 'cyan',
    items: [
      { file: 'FEATURES.md',          title: 'Funcionalidades',          desc: 'Todas as funcionalidades da plataforma descritas em detalhe.' },
      { file: 'VISION_AND_GOALS.md',  title: 'Visão e Objetivos',        desc: 'Missão, objetivos estratégicos e casos de uso da plataforma.' },
      { file: 'ARCHITECTURE.md',      title: 'Arquitetura do Sistema',   desc: 'Visão geral da arquitetura — HYDRA Engine, DDD, camadas.' },
      { file: 'TECHNOLOGY_STACK.md',  title: 'Stack Tecnológica',        desc: '.NET 10, React 19, WebGL 2.0, PostgreSQL, Keycloak e mais.' },
    ],
  },
  {
    category: 'Modelos & Refatoração',
    color: 'rose',
    items: [
      { file: 'ANALYTICAL_MODELS_AND_PHYSICS.md', title: 'Modelos Analíticos e Físicos', desc: 'Fórmulas em AsciiMath para risco, hidrologia, slope, simulação e aproximações visuais.' },
      { file: 'FRONTEND_TOTAL_REFACTOR_PLAN.md', title: 'Plano de Refatoração do Frontend', desc: 'Rotas-alvo, páginas, acessos, domínios e roadmap técnico para reorganizar o produto.' },
      { file: 'AUTHZ_ROLES.md', title: 'Autorização e Papéis', desc: 'Estado atual de RBAC, capacidades alvo e contrato de acesso para o frontend novo.' },
    ],
  },
  {
    category: 'Motor 3D & Renderização',
    color: 'blue',
    items: [
      { file: '3D_RENDERING_PIPELINE.md',   title: 'Pipeline de Renderização 3D', desc: 'Fluxo completo: satélite ESRI → DEM AWS → OSM → HydraEngine WebGL.' },
      { file: 'ARCHITECTURE_CURRENT.md',    title: 'Arquitetura Atual',           desc: 'Estado atual da implementação e componentes ativos.' },
      { file: 'PROJECT_ARCHITECTURE.md',    title: 'Arquitetura do Projeto',       desc: 'Diagramas de classes, módulos e dependências.' },
    ],
  },
  {
    category: 'API & Integrações',
    color: 'violet',
    items: [
      { file: 'API_ENDPOINT_MAP.md',   title: 'Mapa de Endpoints',   desc: 'Todos os endpoints REST documentados com exemplos.' },
      { file: 'INTEGRATIONS.md',       title: 'Integrações',         desc: 'Overpass API, Open-Meteo, NASA GIBS, INMET e outras.' },
      { file: 'MODULES_OVERVIEW.md',   title: 'Visão dos Módulos',   desc: 'Descrição de cada módulo funcional da plataforma.' },
    ],
  },
  {
    category: 'Segurança & Compliance',
    color: 'amber',
    items: [
      { file: 'AUTHZ_ROLES.md',              title: 'Autorização & Papéis',    desc: 'Papéis, permissões e controle de acesso por funcionalidade.' },
      { file: 'SECURITY_AUDIT_REPORT.md',    title: 'Auditoria de Segurança',  desc: 'Relatório de vulnerabilidades e controles implementados.' },
      { file: 'COMPLIANCE_AND_STANDARDS.md', title: 'Compliance',              desc: 'Conformidade com LGPD, padrões ABNT e regulamentações.' },
      { file: 'PRIVACY_TRANSPARENCY_POLICY.md', title: 'Política de Privacidade', desc: 'Política de privacidade e transparência de dados.' },
    ],
  },
  {
    category: 'Operações & Governança',
    color: 'emerald',
    items: [
      { file: 'GOVERNANCE.md',              title: 'Governança',           desc: 'Processos de governança, decisões e responsabilidades.' },
      { file: 'INCIDENT_RESPONSE_POLICY.md', title: 'Resposta a Incidentes', desc: 'Política e procedimentos para resposta a incidentes.' },
      { file: 'DECISIONS.md',               title: 'Decisões de Arquitetura', desc: 'ADRs — registro de decisões arquiteturais.' },
      { file: 'DOMAIN_SPECIFICATION.md',    title: 'Especificação de Domínio', desc: 'Regras de negócio, entidades e linguagem ubíqua.' },
    ],
  },
];

const COLOR_MAP: Record<string, { border: string; bg: string; text: string; badge: string }> = {
  cyan:    { border: 'border-cyan-500/20',   bg: 'bg-cyan-500/10',   text: 'text-cyan-400',   badge: 'bg-cyan-500/10 text-cyan-400' },
  rose:    { border: 'border-rose-500/20',   bg: 'bg-rose-500/10',   text: 'text-rose-400',   badge: 'bg-rose-500/10 text-rose-400' },
  blue:    { border: 'border-blue-500/20',   bg: 'bg-blue-500/10',   text: 'text-blue-400',   badge: 'bg-blue-500/10 text-blue-400' },
  violet:  { border: 'border-violet-500/20', bg: 'bg-violet-500/10', text: 'text-violet-400', badge: 'bg-violet-500/10 text-violet-400' },
  amber:   { border: 'border-amber-500/20',  bg: 'bg-amber-500/10',  text: 'text-amber-400',  badge: 'bg-amber-500/10 text-amber-400' },
  emerald: { border: 'border-emerald-500/20',bg: 'bg-emerald-500/10',text: 'text-emerald-400',badge: 'bg-emerald-500/10 text-emerald-400' },
};

const getDocHref = (file: string) => {
  const htmlFile = file.replace(/\.md$/i, '.html');
  return `/docs/_build/html/${htmlFile}`;
};

export function DocsIndexPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Navbar */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/60">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-cyan-400" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="text-sm font-black tracking-widest text-slate-100 uppercase">SOS Location</span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link to="/docs" className="px-4 py-2 text-sm font-medium text-cyan-400 rounded-lg bg-slate-800/60">
            Documentação
          </Link>
          <Link to="/login" className="ml-2 px-4 py-2 text-sm font-bold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors">
            Login
          </Link>
        </nav>
      </header>

      <div className="max-w-6xl mx-auto px-6 pt-32 pb-24">
        {/* Header */}
        <div className="mb-14">
          <p className="text-[10px] uppercase tracking-[0.5em] text-cyan-400 font-bold mb-3">// docs</p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-4">Documentação</h1>
          <p className="text-slate-400 text-lg max-w-2xl">
            Documentação técnica da plataforma SOS Location com arquitetura, APIs, segurança, modelos analíticos e plano diretor da refatoração do frontend.
          </p>
        </div>

        {/* Categories */}
        <div className="space-y-14">
          {DOCS.map((cat) => {
            const c = COLOR_MAP[cat.color];
            return (
              <div key={cat.category}>
                <div className="flex items-center gap-3 mb-5">
                  <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${c.badge}`}>
                    {cat.category}
                  </span>
                  <div className="flex-1 h-px bg-slate-800" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {cat.items.map((doc) => (
                    <a
                      key={doc.file}
                      href={getDocHref(doc.file)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex flex-col rounded-xl border ${c.border} bg-slate-900/50 p-5 hover:bg-slate-900/80 hover:${c.border.replace('/20', '/40')} transition-all duration-200`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center mb-3 ${c.text}`}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                      <h3 className="font-bold text-slate-100 text-sm mb-1.5 group-hover:text-white transition-colors">
                        {doc.title}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed flex-1">{doc.desc}</p>
                      <div className={`mt-3 flex items-center gap-1 text-xs font-medium ${c.text} opacity-0 group-hover:opacity-100 transition-opacity`}>
                        <span>Abrir</span>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3 h-3">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                        </svg>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
