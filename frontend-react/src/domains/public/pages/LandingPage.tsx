import { useNavigate } from 'react-router-dom';
import { keycloak } from '../../../lib/keycloak';
import { LandingNavbar } from '../../../components/layout/LandingNavbar';
import { DEFAULT_PRIVATE_ROUTE } from '../../../lib/appRouteManifest';

const s = {
  root: {
    minHeight: '100vh',
    backgroundColor: '#020817',
    color: '#f1f5f9',
    fontFamily: "'Inter', system-ui, sans-serif",
    overflowX: 'hidden' as const,
  },
  hero: {
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '5rem 1.5rem 4rem',
    textAlign: 'center' as const,
  },
  glow: {
    display: 'none',
  },
  badge: {
    display: 'inline-block',
    fontSize: '10px',
    letterSpacing: '0.35em',
    textTransform: 'uppercase' as const,
    color: '#22d3ee',
    fontWeight: 700,
    marginBottom: '1.25rem',
  },
  h1: {
    fontSize: 'clamp(2.25rem, 6vw, 4.5rem)',
    fontWeight: 900,
    lineHeight: 1.1,
    letterSpacing: '-0.02em',
    maxWidth: '880px',
    margin: '0 auto',
  },
  h1span: {
    color: '#007AFF',
  },
  subtitle: {
    marginTop: '1.5rem',
    maxWidth: '640px',
    color: '#94a3b8',
    fontSize: 'clamp(1rem, 2vw, 1.125rem)',
    lineHeight: 1.75,
  },
  ctas: {
    marginTop: '3rem',
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '1rem',
    justifyContent: 'center',
  },
  btnPrimary: {
    position: 'relative' as const,
    overflow: 'hidden',
    borderRadius: '12px',
    background: '#0891b2',
    padding: '1rem 2.25rem',
    fontWeight: 700,
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.95rem',
    boxShadow: '0 0 24px rgba(8,145,178,0.35)',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  btnSecondary: {
    borderRadius: '12px',
    border: '1px solid rgba(6,182,212,0.25)',
    background: 'rgba(6,182,212,0.04)',
    padding: '1rem 2.25rem',
    fontWeight: 700,
    color: '#a5f3fc',
    cursor: 'pointer',
    fontSize: '0.95rem',
    transition: 'background 0.2s, border-color 0.2s',
  },
  useCasesSection: {
    width: '100%',
    maxWidth: '1200px',
    margin: '6rem auto 0',
    padding: '0 1.5rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '1.5rem',
  },
  card: {
    padding: '2rem',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.025)',
    textAlign: 'left' as const,
    transition: 'background 0.3s, border-color 0.3s',
  },
  cardNum: {
    width: '48px',
    height: '48px',
    borderRadius: '10px',
    background: 'rgba(6,182,212,0.1)',
    border: '1px solid rgba(6,182,212,0.2)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#22d3ee',
    fontWeight: 900,
    fontSize: '0.85rem',
    marginBottom: '1.5rem',
  },
  cardTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#f1f5f9',
    marginBottom: '0.75rem',
  },
  cardDesc: {
    color: '#64748b',
    fontSize: '0.875rem',
    lineHeight: 1.7,
  },
  divider: {
    width: '100%',
    maxWidth: '900px',
    margin: '6rem auto 0',
    padding: '0 1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem',
  },
  divLine: {
    flex: 1,
    height: '1px',
    background: 'rgba(255,255,255,0.07)',
  },
  divLabel: {
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.3em',
    textTransform: 'uppercase' as const,
    color: '#475569',
    whiteSpace: 'nowrap' as const,
  },
  docsGrid: {
    width: '100%',
    maxWidth: '900px',
    margin: '2rem auto 0',
    padding: '0 1.5rem 6rem',
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '1.25rem',
  },
  docCard1: {
    padding: '2rem',
    borderRadius: '16px',
    border: '1px solid rgba(6,182,212,0.2)',
    background: 'rgba(6,182,212,0.04)',
  },
  docCard2: {
    padding: '2rem',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'rgba(255,255,255,0.02)',
  },
  docCardTitle: {
    fontSize: '1.375rem',
    fontWeight: 700,
    marginBottom: '0.75rem',
  },
  docCardDesc: {
    color: '#64748b',
    lineHeight: 1.7,
    fontSize: '0.9rem',
    marginBottom: '1.5rem',
  },
  docLink: {
    background: 'none',
    border: 'none',
    color: '#22d3ee',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '0.9rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: 0,
  },
  tagRow: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap' as const,
  },
  tag: {
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    fontSize: '10px',
    fontFamily: 'monospace',
    color: '#475569',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.1em',
  },
  footer: {
    borderTop: '1px solid rgba(255,255,255,0.04)',
    background: 'rgba(2,8,23,0.8)',
    padding: '2.5rem 1.5rem',
    textAlign: 'center' as const,
  },
  footerText: {
    fontSize: '11px',
    fontFamily: 'monospace',
    color: '#334155',
    letterSpacing: '0.2em',
    textTransform: 'uppercase' as const,
  },
};

const useCases = [
  { title: 'Desastres Naturais', desc: 'Mapeamento 3D dinâmico de áreas afetadas, identificação de zonas de risco extremo e rotas bloqueadas.' },
  { title: 'Coordenação de Resgate', desc: 'HUD tático em tempo real para centros de comando, direcionando equipes de campo com precisão cirúrgica.' },
  { title: 'Logística Humanitária', desc: 'Organização ágil de suprimentos e definição estratégica de pontos de apoio e abrigos temporários.' },
];

/* ─── Page ───────────────────────────────────────────────────────────────── */
export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div style={s.root}>
      <LandingNavbar />

      <main>
        {/* Hero */}
        <section style={s.hero}>
          <div style={s.glow} />
          <p style={s.badge}>// sos-location system v2.0</p>
          <h1 style={s.h1}>
            Plataforma de{' '}
            <span style={s.h1span}>resposta crítica</span>
            {' '}e transparência
          </h1>
          <p style={s.subtitle}>
            Monitoramento tático em tempo real, reconstrução 3D de cidades e inteligência situacional para operações humanitárias de alta complexidade.
          </p>
          <div style={s.ctas}>
            <button
              style={s.btnPrimary}
              onClick={() => navigate(DEFAULT_PRIVATE_ROUTE)}
              onMouseEnter={e => { (e.currentTarget.style.transform = 'scale(1.04)'); (e.currentTarget.style.boxShadow = '0 0 36px rgba(8,145,178,0.5)'); }}
              onMouseLeave={e => { (e.currentTarget.style.transform = 'scale(1)'); (e.currentTarget.style.boxShadow = '0 0 24px rgba(8,145,178,0.35)'); }}
            >
              Explorar Mapa Tático
            </button>
            <button
              style={s.btnSecondary}
              onClick={() => keycloak.authenticated ? navigate(DEFAULT_PRIVATE_ROUTE) : keycloak.login()}
              onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(6,182,212,0.1)'); (e.currentTarget.style.borderColor = 'rgba(6,182,212,0.5)'); }}
              onMouseLeave={e => { (e.currentTarget.style.background = 'rgba(6,182,212,0.04)'); (e.currentTarget.style.borderColor = 'rgba(6,182,212,0.25)'); }}
            >
              {keycloak.authenticated ? 'Área Logada' : 'Entrar no Sistema'}
            </button>
          </div>
        </section>

        {/* Use Cases */}
        <section style={s.useCasesSection}>
          {useCases.map((item, i) => (
            <div key={i} style={s.card}
              onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(255,255,255,0.05)'); (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'); }}
              onMouseLeave={e => { (e.currentTarget.style.background = 'rgba(255,255,255,0.025)'); (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'); }}
            >
              <div style={s.cardNum}>0{i + 1}</div>
              <h3 style={s.cardTitle}>{item.title}</h3>
              <p style={s.cardDesc}>{item.desc}</p>
            </div>
          ))}
        </section>

        {/* Divider */}
        <div style={s.divider}>
          <div style={s.divLine} />
          <span style={s.divLabel}>Documentação do Ecossistema</span>
          <div style={s.divLine} />
        </div>

        {/* Docs Preview */}
        <div style={s.docsGrid}>
          <div style={s.docCard1}>
            <h3 style={s.docCardTitle}>Manual de Governança</h3>
            <p style={s.docCardDesc}>
              Decisões orientadas pelos pilares de humanidade, resiliência, neutralidade e transparência.
            </p>
            <button style={s.docLink} onClick={() => navigate('/docs')}>
              Ver todos os documentos <span style={{ fontSize: '1.1rem' }}>→</span>
            </button>
          </div>
          <div style={s.docCard2}>
            <h3 style={s.docCardTitle}>Specs Técnicas</h3>
            <p style={s.docCardDesc}>
              Explore a stack baseada em React 19, .NET 10 e Three.js para reconstrução urbana em tempo real.
            </p>
            <div style={s.tagRow}>
              {['Backend', 'Frontend', 'GIS', 'ML'].map(tag => (
                <span key={tag} style={s.tag}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer style={s.footer}>
        <p style={s.footerText}>
          SOS-Location Operational System // v2.0 // Authorized Access Only
        </p>
      </footer>
    </div>
  );
}
