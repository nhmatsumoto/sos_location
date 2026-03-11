import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { User, Heart, Shield, Building2, Users, Briefcase, ChevronRight } from 'lucide-react';

type Role = 'visitor' | 'volunteer' | 'government_rescue' | null;

export function OnboardingPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [role, setRole] = useState<Role>(null);

  const handleFinish = (finalRole: string, finalSubType: string | null) => {
    localStorage.setItem('user_role', finalRole);
    if (finalSubType) localStorage.setItem('user_subtype', finalSubType);
    localStorage.setItem('onboarding_complete', 'true');
    navigate('/app');
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const roles = [
    { id: 'visitor', icon: User, color: 'text-blue-500' },
    { id: 'volunteer', icon: Heart, color: 'text-pink-500' },
    { id: 'government_rescue', icon: Shield, color: 'text-orange-500' }
  ];

  const subTypes = [
    { id: 'volunteer_team', icon: Users },
    { id: 'government', icon: Building2 },
    { id: 'private', icon: Briefcase }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(circle_at_top_right,var(--tw-gradient-stops))] from-blue-900/20 via-slate-900 to-slate-950">
      <div className="absolute top-6 right-6 flex gap-2">
        <button onClick={() => changeLanguage('pt')} className={`px-2 py-1 rounded ${i18n.language.startsWith('pt') ? 'bg-blue-600' : 'bg-slate-800'}`}>PT</button>
        <button onClick={() => changeLanguage('en')} className={`px-2 py-1 rounded ${i18n.language.startsWith('en') ? 'bg-blue-600' : 'bg-slate-800'}`}>EN</button>
        <button onClick={() => changeLanguage('ja')} className={`px-2 py-1 rounded ${i18n.language.startsWith('ja') ? 'bg-blue-600' : 'bg-slate-800'}`}>JA</button>
      </div>

      <div className="max-w-4xl w-full">
        <header className="text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl font-bold mb-4 bg-clip-text text-transparent bg-linear-to-r from-blue-400 to-cyan-300">
            {t('onboarding.title')}
          </h1>
          <p className="text-slate-400 text-lg">
            {!role ? t('onboarding.subtitle') : t('onboarding.subtypes.title')}
          </p>
        </header>

        {!role ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  if (r.id === 'government_rescue') setRole('government_rescue');
                  else handleFinish(r.id, null);
                }}
                className="group relative bg-slate-800/50 border border-slate-700/50 p-8 rounded-2xl hover:border-blue-500/50 hover:bg-slate-800 transition-all duration-300 text-left overflow-hidden hover:shadow-[0_0_40px_-15px_rgba(59,130,246,0.5)]"
              >
                <div className={`mb-6 p-4 rounded-xl bg-slate-900/50 w-fit group-hover:scale-110 transition-transform ${r.color}`}>
                  <r.icon size={32} />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t(`onboarding.roles.${r.id}.title`)}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {t(`onboarding.roles.${r.id}.description`)}
                </p>
                <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ChevronRight className="text-blue-500" />
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-12">
              {subTypes.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleFinish('government_rescue', s.id)}
                  className="group bg-slate-800/50 border border-slate-700/50 p-8 rounded-2xl hover:border-orange-500/50 hover:bg-slate-800 transition-all duration-300 text-center"
                >
                  <div className="mb-6 mx-auto p-4 rounded-xl bg-slate-900/50 w-fit group-hover:scale-110 transition-transform text-orange-400">
                    <s.icon size={32} />
                  </div>
                  <h3 className="text-xl font-semibold">{t(`onboarding.subtypes.${s.id}`)}</h3>
                </button>
              ))}
            </div>
            <button
              onClick={() => setRole(null)}
              className="px-6 py-2 text-slate-400 hover:text-white transition-colors"
            >
              {t('onboarding.actions.back')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
