import React from "react";
import { platform } from "../platform/platformManager";
import type { PlatformId, PlatformInfo } from "../platform/types";

interface PlatformSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlatform: PlatformId;
  onSelectPlatform: (id: PlatformId) => void;
}

export const PlatformSwitcher: React.FC<PlatformSwitcherProps> = ({
  isOpen,
  onClose,
  currentPlatform,
  onSelectPlatform,
}) => {
  if (!isOpen) return null;

  const platforms = platform.getPlatformList();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl max-h-[85vh] overflow-y-auto apple-glass-card rounded-[28px] p-6 flex flex-col gap-5 border border-white/15 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple-style Sheet Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl"></span>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight font-apple">Platform Environment</h3>
              <p className="text-xs text-white/60 font-apple">Universal Platform SDK — Test all 13 platforms live</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white flex items-center justify-center transition-all duration-150 apple-spring-press"
          >
            ✕
          </button>
        </div>

        {/* Platform Grid Bento */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto pr-1">
          {platforms.map((info: PlatformInfo) => {
            const isSelected = info.id === currentPlatform;
            return (
              <button
                key={info.id}
                onClick={() => {
                  onSelectPlatform(info.id);
                  onClose();
                }}
                className={`text-left p-4 rounded-2xl transition-all duration-200 apple-spring-press border flex flex-col gap-2 ${
                  isSelected
                    ? "bg-[#0071e3]/20 border-[#0071e3] shadow-[0_0_20px_rgba(0,113,227,0.35)]"
                    : "bg-white/5 hover:bg-white/10 border-white/10"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{info.icon}</span>
                    <div>
                      <h4 className="text-sm font-semibold text-white tracking-tight font-apple">{info.name}</h4>
                      <span className="text-[10px] text-white/50">{info.vendor}</span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#0071e3] text-white">
                      Active
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-white/70 line-clamp-2 leading-relaxed">{info.description}</p>

                <div className="flex items-center gap-1.5 flex-wrap pt-1 border-t border-white/5 text-[9px] text-white/50">
                  {info.features.cloudSave && <span className="px-1.5 py-0.5 rounded bg-white/10">☁️ Cloud</span>}
                  {info.features.leaderboards && <span className="px-1.5 py-0.5 rounded bg-white/10">🏆 Board</span>}
                  {info.features.audioSync && <span className="px-1.5 py-0.5 rounded bg-white/10">🔊 Audio</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer Note */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/50 font-apple">
          <span>Zero Playgama dependency • Native direct SDK adapters</span>
          <button
            onClick={onClose}
            className="apple-action-btn text-xs px-5 py-2 font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
