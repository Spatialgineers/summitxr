import React, { useState, useEffect } from 'react';
import { PrizeTier } from '../../types/engine';
import { db } from '../../lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { PRIZE_TIERS as DEFAULT_TIERS } from '../../lib/gamification';
import { Save, Plus, Trash2, Gift, Edit3, X } from 'lucide-react';

export const GamificationTierManager: React.FC = () => {
  const [tiers, setTiers] = useState<PrizeTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTier, setEditingTier] = useState<PrizeTier | null>(null);

  useEffect(() => {
    loadTiers();
  }, []);

  const loadTiers = async () => {
    try {
      const snap = await getDocs(collection(db, 'gamification_tiers'));
      if (snap.empty) {
        setTiers(DEFAULT_TIERS);
      } else {
        const loaded = snap.docs.map(d => d.data() as PrizeTier);
        setTiers(loaded.sort((a, b) => a.minPoints - b.minPoints));
      }
    } catch (err) {
      console.warn("Failed to load gamification tiers", err);
      setTiers(DEFAULT_TIERS);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTier = async () => {
    if (!editingTier) return;
    try {
      await setDoc(doc(db, 'gamification_tiers', editingTier.id), editingTier);
      setEditingTier(null);
      loadTiers();
    } catch (err) {
      console.error("Error saving tier", err);
      alert("Error guardando el nivel.");
    }
  };

  const handleDeleteTier = async (id: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar este nivel?')) return;
    try {
      await deleteDoc(doc(db, 'gamification_tiers', id));
      loadTiers();
    } catch (err) {
      console.error("Error deleting tier", err);
    }
  };

  const handleCreateNew = () => {
    setEditingTier({
      id: `tier_${Date.now()}`,
      tier: 'NEW_TIER',
      name: 'Nuevo Nivel',
      description: 'Descripción del premio...',
      minPoints: 1000,
      minInteractions: 1,
      badgeIcon: '✨',
      perkReward: 'Recompensa...',
      couponCode: 'CODE-XXX',
      color: '#FFFFFF'
    });
  };

  if (loading) return <div className="text-white text-xs font-mono">Cargando Tiers...</div>;

  return (
    <div className="sgx-panel space-y-4">
      <div className="flex items-center justify-between border-b border-[var(--sgx-secondary)] pb-3">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider font-['Orbitron',sans-serif]">
          Gamification Multipliers & Prize Unlock Tiers
        </h3>
        <button
          onClick={handleCreateNew}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#121212] border border-[var(--sgx-neon)] text-[var(--sgx-neon)] hover:bg-[var(--sgx-neon)] hover:text-black font-bold text-xs font-mono transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Añadir Nivel</span>
        </button>
      </div>

      {editingTier && (
        <div className="p-4 bg-[#121212] border border-[var(--sgx-accent)] space-y-3 shadow-xl">
          <div className="flex items-center justify-between">
            <h4 className="text-[var(--sgx-accent)] font-bold text-xs">Editando: {editingTier.name}</h4>
            <button onClick={() => setEditingTier(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-mono">ID / Key (eg. tier_gold)</label>
              <input type="text" value={editingTier.id} onChange={e => setEditingTier({...editingTier, id: e.target.value})} className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono" disabled={tiers.some(t => t.id === editingTier.id && editingTier.id !== t.id)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-mono">Tier Code (eg. GOLD)</label>
              <input type="text" value={editingTier.tier} onChange={e => setEditingTier({...editingTier, tier: e.target.value as any})} className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-mono">Name</label>
              <input type="text" value={editingTier.name} onChange={e => setEditingTier({...editingTier, name: e.target.value})} className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-mono">Badge Icon (Emoji)</label>
              <input type="text" value={editingTier.badgeIcon} onChange={e => setEditingTier({...editingTier, badgeIcon: e.target.value})} className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-mono">Min Points</label>
              <input type="number" value={editingTier.minPoints} onChange={e => setEditingTier({...editingTier, minPoints: Number(e.target.value)})} className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-mono">Min Interactions</label>
              <input type="number" value={editingTier.minInteractions} onChange={e => setEditingTier({...editingTier, minInteractions: Number(e.target.value)})} className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] text-slate-400 font-mono">Description</label>
              <input type="text" value={editingTier.description} onChange={e => setEditingTier({...editingTier, description: e.target.value})} className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono" />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[10px] text-slate-400 font-mono">Perk Reward</label>
              <input type="text" value={editingTier.perkReward} onChange={e => setEditingTier({...editingTier, perkReward: e.target.value})} className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-mono">Coupon Code</label>
              <input type="text" value={editingTier.couponCode} onChange={e => setEditingTier({...editingTier, couponCode: e.target.value})} className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-mono">Color</label>
              <input type="color" value={editingTier.color} onChange={e => setEditingTier({...editingTier, color: e.target.value})} className="w-full bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] h-[34px] p-1 cursor-pointer" />
            </div>
          </div>
          <button
            onClick={handleSaveTier}
            className="w-full py-2 bg-[var(--sgx-accent)] text-black font-bold font-mono text-xs flex items-center justify-center space-x-2 mt-4 hover:bg-yellow-400"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Tier</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {tiers.map((tier) => (
          <div key={tier.id} className="p-3 bg-[var(--sgx-bg)] border border-[var(--sgx-secondary)] text-xs font-mono space-y-1.5 hover:border-[var(--sgx-neon)] transition-colors relative group">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{tier.badgeIcon}</span>
                <span className="text-[10px] font-bold" style={{ color: tier.color }}>{tier.tier}</span>
              </div>
              <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => setEditingTier(tier)} className="p-1 text-slate-400 hover:text-white bg-[#121212] border border-[var(--sgx-secondary)]">
                  <Edit3 className="w-3 h-3" />
                </button>
                <button onClick={() => handleDeleteTier(tier.id)} className="p-1 text-slate-400 hover:text-red-400 bg-[#121212] border border-[var(--sgx-secondary)]">
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
            <div className="font-bold text-white text-sm">{tier.name}</div>
            <p className="text-[10px] text-slate-400 line-clamp-2" title={tier.description}>{tier.description}</p>
            <div className="pt-1 border-t border-[var(--sgx-secondary)]/50 flex justify-between text-[10px] text-[var(--sgx-neon)]">
              <span>Pts: {tier.minPoints}</span>
              <span>Ints: {tier.minInteractions}</span>
            </div>
            <div className="text-[9px] text-[var(--sgx-accent)] line-clamp-1">{tier.perkReward}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
