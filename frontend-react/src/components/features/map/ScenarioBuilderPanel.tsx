import React, { useState } from "react";
import { Box, Layers, Play, Settings2, ShieldAlert } from "lucide-react";
import { useNotifications } from "../../../context/NotificationsContext";
import { useSimulationStore } from "../../../store/useSimulationStore";

export const ScenarioBuilderPanel: React.FC<{ onClose: () => void }> = ({
  onClose,
}) => {
  const { pushNotice } = useNotifications();
  const { hazardType, setHazardType, setWaterLevel } = useSimulationStore();

  const [isBuilding, setIsBuilding] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const HAZARD_TYPES = [
    "Flood",
    "Earthquake",
    "Landslide",
    "Cyclone",
    "DamBreak",
    "Contamination",
  ];

  const handleRun = () => {
    setIsRunning(true);
    setWaterLevel(0);
    // Simulate API delay
    setTimeout(() => {
      let level = 0;
      const interval = setInterval(() => {
        level += 1;
        setWaterLevel(level);
        if (level >= 15) {
          clearInterval(interval);
          setIsRunning(false);
          pushNotice({
            type: "success",
            title: "Simulação " + hazardType,
            message:
              "Simulação concluída com sucesso. Layers de impacto disponíveis.",
          });
        }
      }, 500);
    }, 1500);
  };

  const handleBuildExposure = () => {
    setIsBuilding(true);
    setTimeout(() => {
      setIsBuilding(false);
      pushNotice({
        type: "success",
        title: "Exposição",
        message: "Datasets e exposição gerados com sucesso.",
      });
    }, 2000);
  };

  return (
    <div className="absolute top-4 left-64 z-20 w-80 bg-slate-900/95 border border-cyan-500/50 rounded-xl backdrop-blur-xl shadow-2xl animate-in fade-in zoom-in duration-300 overflow-hidden flex flex-col">
      <div className="p-4 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
        <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-baseline gap-2">
          <Box size={14} /> SCENARIO BUILDER
        </h3>
        <button
          onClick={onClose}
          className="text-slate-500 hover:text-white transition-colors"
        >
          ✖
        </button>
      </div>

      <div className="p-4 space-y-4 text-[11px] text-slate-300">
        <div className="space-y-2">
          <label className="text-[9px] uppercase font-bold text-slate-500">
            Hazard Type (Plugin)
          </label>
          <select
            value={hazardType}
            onChange={(e) => setHazardType(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-cyan-400 font-bold focus:outline-none focus:border-cyan-500"
          >
            {HAZARD_TYPES.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 p-3 bg-slate-950/50 rounded border border-white/5">
          <div className="text-[9px] uppercase font-bold text-slate-500 flex items-center gap-1 mb-2">
            <Settings2 size={10} /> Parameters
          </div>

          {hazardType === "Earthquake" && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Magnitude"
                className="bg-slate-800 border-none p-2 rounded"
              />
              <input
                type="number"
                placeholder="Depth (km)"
                className="bg-slate-800 border-none p-2 rounded"
              />
            </div>
          )}

          {hazardType === "Flood" && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Rainfall (mm)"
                className="bg-slate-800 border-none p-2 rounded"
              />
            </div>
          )}

          {hazardType === "Cyclone" && (
            <div className="grid grid-cols-2 gap-2">
              <input
                type="number"
                placeholder="Wind (km/h)"
                className="bg-slate-800 border-none p-2 rounded"
              />
              <select className="bg-slate-800 border-none p-2 rounded">
                <option>Cat 1</option>
                <option>Cat 5</option>
              </select>
            </div>
          )}

          {["Contamination", "Landslide", "DamBreak"].includes(hazardType) && (
            <div className="text-slate-500 italic">
              Parameters auto-configured for MVP.
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-400 flex items-center gap-1">
              <ShieldAlert size={10} /> Exposure & Vulnerability
            </span>
            <span className="text-amber-500 font-bold">OSM Fallback</span>
          </div>
          <button
            disabled={isBuilding}
            className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold py-2 rounded transition-colors flex justify-center items-center gap-2"
            onClick={handleBuildExposure}
          >
            {isBuilding ? (
              <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
            ) : (
              <Layers size={14} />
            )}
            BUILD EXPOSURE
          </button>
        </div>

        <div className="pt-2 border-t border-white/10">
          <button
            disabled={isRunning}
            className={`w-full font-bold py-3 rounded transition-colors flex justify-center items-center gap-2 ${
              isRunning
                ? "bg-emerald-900 text-emerald-500 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]"
            }`}
            onClick={handleRun}
          >
            {isRunning ? (
              <span className="animate-pulse">RUNTIME EXECUTING...</span>
            ) : (
              <>
                <Play size={14} /> RUN FULL SIMULATION
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
