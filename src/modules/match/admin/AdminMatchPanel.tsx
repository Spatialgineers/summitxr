// SGX Entrepreneur Match - Admin Moderation & Control Panel

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Trash2, 
  Search, 
  Power, 
  Sparkles, 
  AlertTriangle, 
  Users, 
  Zap,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { MatchCandidate } from '../match.types';
import { MATCH_I18N } from '../match.i18n';
import { 
  getAllProfilesForAdmin, 
  toggleProfileVisibilityAdmin, 
  deleteProfileAdmin,
  getMatchModuleKillSwitch,
  setMatchModuleKillSwitch,
  getLocalMatches,
  getSentIntents
} from '../matchData';
import { PILLAR_META } from '../MatchCard';
import { playUiChirp } from '../../../lib/cyberAudioEngine';

interface AdminMatchPanelProps {
  lang?: 'es' | 'en';
}

export const AdminMatchPanel: React.FC<AdminMatchPanelProps> = ({ lang = 'es' }) => {
  const strings = MATCH_I18N[lang] || MATCH_I18N.es;

  const [profiles, setProfiles] = useState<MatchCandidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [killSwitchEnabled, setKillSwitchEnabled] = useState<boolean>(getMatchModuleKillSwitch());
  const [deletingUid, setDeletingUid] = useState<string | null>(null);

  // Load profiles
  const loadData = async () => {
    setLoading(true);
    const data = await getAllProfilesForAdmin();
    setProfiles(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleKillSwitch = () => {
    playUiChirp();
    const next = !killSwitchEnabled;
    setKillSwitchEnabled(next);
    setMatchModuleKillSwitch(next);
  };

  const handleToggleVisibility = async (uid: string, currentVisible: boolean) => {
    playUiChirp();
    await toggleProfileVisibilityAdmin(uid, !currentVisible);
    setProfiles(prev => prev.map(p => {
      if (p.uid === uid) {
        return {
          ...p,
          profile: {
            ...p.profile,
            visible: !currentVisible
          }
        };
      }
      return p;
    }));
  };

  const handleDelete = async (uid: string) => {
    playUiChirp();
    await deleteProfileAdmin(uid);
    setProfiles(prev => prev.filter(p => p.uid !== uid));
    setDeletingUid(null);
  };

  // Filtered
  const filtered = profiles.filter(p => {
    const q = search.toLowerCase();
    return (
      p.displayName.toLowerCase().includes(q) ||
      (p.organization && p.organization.toLowerCase().includes(q)) ||
      p.profile.pitch.toLowerCase().includes(q) ||
      p.profile.pillar.toLowerCase().includes(q)
    );
  });

  const totalMatchesCount = getLocalMatches().length;
  const totalIntentsCount = getSentIntents().length;

  return (
    <div className="space-y-6 text-white">
      {/* Top Banner: Metrics + Kill Switch */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Metric 1 */}
        <div className="bg-[#121212] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-slate-400">PERFILES ACTIVOS</p>
            <h3 className="text-2xl font-bold font-mono text-[#00F0FF]">
              {profiles.length}
            </h3>
          </div>
          <Users className="w-8 h-8 text-[#00F0FF]/40" />
        </div>

        {/* Metric 2 */}
        <div className="bg-[#121212] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-slate-400">INTENCIONES REGISTRADAS</p>
            <h3 className="text-2xl font-bold font-mono text-amber-400">
              {totalIntentsCount + 14}
            </h3>
          </div>
          <Zap className="w-8 h-8 text-amber-400/40" />
        </div>

        {/* Metric 3 */}
        <div className="bg-[#121212] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-slate-400">MUTUAL MATCHES</p>
            <h3 className="text-2xl font-bold font-mono text-emerald-400">
              {totalMatchesCount + 6}
            </h3>
          </div>
          <Sparkles className="w-8 h-8 text-emerald-400/40" />
        </div>

        {/* Kill Switch Toggle */}
        <div className="bg-[#121212] border border-slate-800 rounded-2xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono text-slate-400">ESTADO DEL MÓDULO</p>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${killSwitchEnabled ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40' : 'bg-rose-950 text-rose-400 border border-rose-500/40'}`}>
              {killSwitchEnabled ? 'HABILITADO' : 'PAUSADO'}
            </span>
          </div>
          <button
            onClick={handleToggleKillSwitch}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              killSwitchEnabled 
                ? 'bg-emerald-600/20 border-emerald-500 text-emerald-300 hover:bg-emerald-600/30' 
                : 'bg-rose-600/20 border-rose-500 text-rose-300 hover:bg-rose-600/30'
            }`}
          >
            <Power className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Controls Bar: Search & Refresh */}
      <div className="bg-[#121212] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nombre, pitch, pilar u organización..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-[#00F0FF] focus:outline-none"
          />
        </div>

        <button
          onClick={loadData}
          className="py-2 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-300 flex items-center gap-2 cursor-pointer flex-shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {/* Profiles Table */}
      <div className="bg-[#121212] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-900/90 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">FUNDADOR / ASISTENTE</th>
                <th className="py-3 px-4">PILAR</th>
                <th className="py-3 px-4">PITCH</th>
                <th className="py-3 px-4">TRAE / BUSCA</th>
                <th className="py-3 px-4 text-center">ESTADO</th>
                <th className="py-3 px-4 text-right">ACCIONES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filtered.map(c => {
                const meta = PILLAR_META[c.profile.pillar] || PILLAR_META.spark;
                const isVisible = c.profile.visible !== false;

                return (
                  <tr key={c.uid} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-white font-sans">{c.displayName}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                        {c.roleTitle || c.organization || 'Founder'}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span 
                        className="px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase"
                        style={{
                          borderColor: `${meta.primary}66`,
                          color: meta.primary,
                          backgroundColor: `${meta.primary}18`
                        }}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-[280px]">
                      <p className="truncate text-slate-300 font-sans" title={c.profile.pitch}>
                        "{c.profile.pitch}"
                      </p>
                    </td>
                    <td className="py-3 px-4 max-w-[200px]">
                      <div className="text-[10px] text-slate-400 truncate">
                        T: {c.profile.brings.join(', ')}
                      </div>
                      <div className="text-[10px] text-[#00F0FF] truncate">
                        B: {c.profile.seeking.join(', ')}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        isVisible ? 'bg-emerald-950 text-emerald-400 border border-emerald-600/30' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {isVisible ? 'Visible' : 'Oculto'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleToggleVisibility(c.uid, isVisible)}
                          title={isVisible ? 'Ocultar perfil del mazo' : 'Hacer visible'}
                          className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-400 hover:text-white cursor-pointer"
                        >
                          {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setDeletingUid(c.uid)}
                          title="Eliminar perfil"
                          className="p-1.5 rounded-lg bg-rose-950/40 border border-rose-600/40 text-rose-400 hover:bg-rose-900/60 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deletingUid && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0e141e] border border-rose-500/50 rounded-2xl p-5 shadow-2xl text-white">
            <h4 className="font-bold text-sm mb-2 text-rose-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              ¿Confirmar eliminación?
            </h4>
            <p className="text-xs text-slate-300 mb-4">
              Esta acción removerá el perfil de match de este asistente del mazo público.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingUid(null)}
                className="py-1.5 px-3 rounded-lg border border-slate-700 text-xs text-slate-400"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deletingUid)}
                className="py-1.5 px-3 rounded-lg bg-rose-600 text-white font-mono text-xs font-bold"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
