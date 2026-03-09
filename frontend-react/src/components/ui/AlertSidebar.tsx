import React from 'react';
import { Bell, Info, Clock, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Alert {
    id: string;
    title: string;
    description: string;
    severity: number | string;
    source: string;
    timestamp?: string;
    lat?: number;
    lon?: number;
    affectedPopulation?: number;
    sourceUrl?: string;
}

interface AlertSidebarProps {
    alerts: Alert[];
    onAlertClick?: (alert: Alert) => void;
    open?: boolean;
    kpis?: {
        criticalAlerts: number;
        activeTeams: number;
        missingPersons: number;
    };
}

export const AlertSidebar: React.FC<AlertSidebarProps> = ({ alerts, onAlertClick, open = true, kpis }) => {
    if (!open) return null;

    const getSeverityStyles = (severity: number | string) => {
        const s = typeof severity === 'string' ? parseInt(severity) : severity;
        const lowerSeverity = severity.toString().toLowerCase();

        if (s >= 4 || lowerSeverity === 'perigo' || lowerSeverity === 'critical' || lowerSeverity === 'extremo') {
            return 'border-l-red-500 bg-red-500/10 text-red-200';
        }
        if (s >= 2 || lowerSeverity === 'atenção' || lowerSeverity === 'high' || lowerSeverity === 'warning') {
            return 'border-l-amber-500 bg-amber-500/10 text-amber-200';
        }
        return 'border-l-cyan-500 bg-cyan-500/10 text-cyan-200';
    };

    return (
        <div className="absolute top-[73px] left-0 bottom-0 w-[320px] bg-slate-950 border-r border-white/10 z-40 flex flex-col animate-in slide-in-from-left duration-500 shadow-2xl">
            <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-2">
                    <Bell size={16} className="text-cyan-400" />
                    <h2 className="text-[11px] font-black text-white uppercase tracking-[0.2em]">Live Alerts</h2>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-[9px] font-bold text-cyan-400">
                    {alerts.length} NEW
                </span>
            </div>

            {kpis && (
                <div className="grid grid-cols-3 gap-2 p-4 border-b border-white/5 bg-white/2">
                    <div className="flex flex-col items-center p-2 rounded-xl bg-red-500/5 border border-red-500/10">
                        <span className="text-[12px] font-black text-red-400">{kpis.criticalAlerts}</span>
                        <span className="text-[7px] uppercase font-bold text-red-500/40 tracking-widest">Alertas</span>
                    </div>
                    <div className="flex flex-col items-center p-2 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
                        <span className="text-[12px] font-black text-cyan-400">{kpis.activeTeams}</span>
                        <span className="text-[7px] uppercase font-bold text-cyan-500/40 tracking-widest">Equipes</span>
                    </div>
                    <div className="flex flex-col items-center p-2 rounded-xl bg-orange-500/5 border border-orange-500/10">
                        <span className="text-[12px] font-black text-orange-400">{kpis.missingPersons}</span>
                        <span className="text-[7px] uppercase font-bold text-orange-500/40 tracking-widest">Buscas</span>
                    </div>
                </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {alerts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 opacity-40">
                        <Info size={24} />
                        <span className="text-[10px] uppercase font-bold tracking-widest">No active alerts</span>
                    </div>
                ) : (
                    alerts.map((alert) => (
                        <div
                            key={alert.id}
                            onClick={() => onAlertClick?.(alert)}
                            className={`group p-4 rounded-xl border border-white/5 border-l-4 transition-all hover:bg-white/5 cursor-pointer hover:border-white/20 active:scale-[0.98] ${getSeverityStyles(alert.severity)}`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-60 flex items-center gap-1">
                                    <Clock size={10} />
                                    {alert.timestamp ? formatDistanceToNow(new Date(alert.timestamp), { addSuffix: true, locale: ptBR }) : 'Recent'}
                                </span>
                                {alert.lat && alert.lon && (
                                    <MapPin size={10} className="text-cyan-400 opacity-60" />
                                )}
                            </div>
                            <h3 className="text-[11px] font-bold text-white mb-1 leading-tight group-hover:text-cyan-300 transition-colors">
                                {alert.title}
                            </h3>
                            <p className="text-[10px] text-slate-400 line-clamp-2 leading-relaxed mb-3">
                                {alert.description}
                            </p>

                            {alert.affectedPopulation && (
                                <div className="mb-3 px-2 py-1 bg-white/5 rounded border border-white/5 flex items-center justify-between">
                                    <span className="text-[8px] font-mono text-slate-500 uppercase">Impacto Est.</span>
                                    <span className="text-[9px] font-bold text-white">
                                        {alert.affectedPopulation.toLocaleString()} pessoas
                                    </span>
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <span className={`h-1.5 w-1.5 rounded-full ${alert.source === 'INMET' ? 'bg-orange-400' : alert.source === 'CEMADEN' ? 'bg-blue-400' : 'bg-red-400'}`} />
                                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-tighter">
                                        Source: {alert.source}
                                    </span>
                                </div>
                                <div className="h-1.5 w-1.5 rounded-full bg-current animate-pulse opacity-40" />
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-4 bg-slate-900/40 border-t border-white/5">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[8px] font-mono text-slate-500 uppercase tracking-widest">
                        <span>Grid Status</span>
                        <span className="text-emerald-400">Stable</span>
                    </div>
                    <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 w-[88%]" />
                    </div>
                </div>
            </div>
        </div>
    );
};
