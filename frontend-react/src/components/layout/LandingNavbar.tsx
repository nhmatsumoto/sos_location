import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { keycloak } from '../../lib/keycloak';

const s = {
  nav: {
    position: 'fixed' as const,
    top: 0,
    zIndex: 50,
    width: '100%',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    background: 'rgba(2,8,23,0.6)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  },
  inner: {
    maxWidth: '1280px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem 1.5rem',
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    textDecoration: 'none',
    color: 'inherit',
  },
  logoMark: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: '#0891b2',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 900,
    color: '#fff',
    fontSize: '0.9rem',
    boxShadow: '0 0 15px rgba(8,145,178,0.4)',
  },
  logoText: {
    fontSize: '1.1rem',
    fontWeight: 700,
    letterSpacing: '-0.01em',
  },
  logoHighlight: {
    color: '#22d3ee',
  },
  links: {
    display: 'flex',
    alignItems: 'center',
    gap: '2rem',
  },
  link: {
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#64748b',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
  separator: {
    width: '1px',
    height: '16px',
    background: 'rgba(255,255,255,0.08)',
  },
  loginBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    borderRadius: '8px',
    background: 'rgba(6,182,212,0.08)',
    padding: '0.5rem 1rem',
    fontSize: '0.875rem',
    fontWeight: 700,
    color: '#22d3ee',
    border: '1px solid rgba(6,182,212,0.2)',
    cursor: 'pointer',
    transition: 'background 0.2s, border-color 0.2s',
  },
  pulseDot: {
    width: '6px',
    height: '6px',
    borderRadius: '9999px',
    background: '#22d3ee',
    animation: 'pulse 2s infinite',
  },
};

export function LandingNavbar() {
  const navigate = useNavigate();

  return (
    <nav style={s.nav}>
      <div style={s.inner}>
        {/* Logo */}
        <div style={s.logo} onClick={() => navigate('/')}>
          <div style={s.logoMark}>S</div>
          <span style={s.logoText}>
            SOS <span style={s.logoHighlight}>Location</span>
          </span>
        </div>

        {/* Links */}
        <div style={s.links}>
          <Link
            to="/docs"
            style={s.link}
            onMouseEnter={e => (e.currentTarget.style.color = '#22d3ee')}
            onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
          >
            Documentação
          </Link>
          <Link
            to="/transparency"
            style={s.link}
            onMouseEnter={e => (e.currentTarget.style.color = '#22d3ee')}
            onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
          >
            Transparência
          </Link>

          <div style={s.separator} />

          <button
            onClick={() => (keycloak.authenticated ? navigate('/app/sos') : keycloak.login())}
            style={s.loginBtn}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(6,182,212,0.16)';
              e.currentTarget.style.borderColor = 'rgba(6,182,212,0.4)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(6,182,212,0.08)';
              e.currentTarget.style.borderColor = 'rgba(6,182,212,0.2)';
            }}
          >
            {keycloak.authenticated ? (
              <>
                <div style={s.pulseDot} />
                Acessar War Room
              </>
            ) : (
              'Login Operacional'
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}
