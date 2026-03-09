import React from 'react';
import { ShieldAlert, Box, Crosshair } from 'lucide-react';
import { CountryDropdown } from './CountryDropdown';
import { CitySearch } from './CitySearch';

interface SOSHeaderHUDProps {
  country: string;
  setCountry: (val: string) => void;
  show3D: boolean;
  setShow3D: (val: boolean) => void;
  onReset: () => void;
}

export const SOSHeaderHUD: React.FC<SOSHeaderHUDProps> = ({ country, setCountry, show3D, setShow3D, onReset }) => {
  return (
    <div className="absolute top-6 left-6 right-6 z-50 flex justify-between items-start pointer-events-none">
      <div className="flex flex-col gap-2">
        <div className="flex gap-4 items-center bg-slate-950/40 border border-white/10 p-2 rounded-2xl backdrop-blur-md pointer-events-auto shadow-[0_8px_32px_rgba(0,0,0,0.5)] border-l-cyan-500/50 border-l-2">
          <ShieldAlert className="h-5 w-5 text-cyan-400 animate-pulse ml-2" />
          <div className="flex flex-col">
            <h1 className="text-[10px] font-black text-white uppercase tracking-[0.2em] leading-none mb-1">SOS COMMAND <span className="text-cyan-500/80">CENTER</span></h1>
            <div className="flex items-center gap-2">
              <span className="h-1 w-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              <span className="text-[8px] text-slate-400 font-mono uppercase tracking-tighter">System: Active_v5.0</span>
            </div>
          </div>
          <div className="h-6 w-px bg-white/5 mx-2" />
          <CitySearch />
          <div className="h-6 w-px bg-white/5 mx-2" />
          <CountryDropdown value={country} onChange={setCountry} />
        </div>
        
        {/* Animated Status Line */}
        <div className="h-px w-48 bg-linear-to-r from-cyan-500/50 to-transparent ml-4 animate-in slide-in-from-left duration-1000" />
      </div>

      <div className="flex gap-3 pointer-events-auto">
         <button 
           onClick={() => setShow3D(!show3D)} 
           className={`group relative flex items-center gap-3 px-5 py-2.5 rounded-2xl border transition-all duration-500 overflow-hidden ${
             show3D 
             ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.2)]' 
             : 'bg-slate-950/40 border-white/10 text-slate-400 hover:border-white/20 hover:text-white backdrop-blur-md'
           }`}
         >
           <Box size={18} className={`${show3D ? 'animate-bounce' : ''}`} /> 
           <div className="flex flex-col items-start">
             <span className="text-[10px] font-black uppercase tracking-widest leading-none">Tactical 3D</span>
             <span className="text-[7px] font-mono opacity-50 uppercase tracking-tighter">{show3D ? 'Active' : 'Standby'}</span>
           </div>
           
           {/* Glow Effect */}
           {show3D && <div className="absolute inset-0 bg-cyan-400/10 animate-pulse pointer-events-none" />}
         </button>

         <button 
           onClick={onReset} 
           className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-slate-950/40 text-slate-400 hover:text-white hover:border-white/20 hover:scale-105 active:scale-95 backdrop-blur-md transition-all shadow-lg"
           title="Re-calibrate View"
         >
           <Crosshair size={20} />
         </button>
      </div>
    </div>
  );
};
