import React, { useState, useEffect } from 'react';
import { 
  GamificationReward, 
  RewardCategory 
} from '../../types/gamification';
import { 
  loadAllRewards, 
  saveReward, 
  deleteReward, 
  resetDefaultRewards,
  INITIAL_REWARDS
} from '../../lib/rewardsStore';
import { 
  Gift, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  X, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle, 
  Zap, 
  ExternalLink,
  Tag,
  ShieldCheck,
  Layers,
  Sparkles
} from 'lucide-react';

export const AdminRewardsManager: React.FC = () => {
  const [rewards, setRewards] = useState<GamificationReward[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingReward, setEditingReward] = useState<GamificationReward | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [featureInput, setFeatureInput] = useState<string>('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchRewards();
  }, []);

  const fetchRewards = async () => {
    setLoading(true);
    try {
      const data = await loadAllRewards();
      setRewards(data);
    } catch (err) {
      console.error("Error loading rewards for admin", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreate = () => {
    const newId = `reward_${Date.now()}`;
    setEditingReward({
      id: newId,
      title: 'Nueva Suscripción o Servicio SGX',
      category: 'WEBAPP_SUBSCRIPTION',
      description: 'Describe en qué consiste el beneficio o suscripción para los asistentes...',
      xpCost: 600,
      originalValueUsd: '$100',
      inventoryCount: 50,
      claimedCount: 0,
      badgeIcon: '⚡',
      themeColor: '#00DDFF',
      active: true,
      accessUrl: 'https://spatialgineers.com',
      accessCodePrefix: 'SGX-PERK-',
      features: ['Acceso instantáneo', 'Soporte prioritario'],
      sponsorName: 'Spatialgineers Ecosystem',
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    setIsCreatingNew(true);
  };

  const handleStartEdit = (reward: GamificationReward) => {
    setEditingReward({ ...reward });
    setIsCreatingNew(false);
  };

  const handleSave = async () => {
    if (!editingReward || !editingReward.title) {
      alert("El premio debe tener un título válido.");
      return;
    }

    try {
      await saveReward(editingReward);
      setSaveSuccessMsg(`Premio "${editingReward.title}" guardado correctamente.`);
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      setEditingReward(null);
      setIsCreatingNew(false);
      fetchRewards();
    } catch (err) {
      console.error("Error saving reward", err);
      alert("Error al guardar el premio.");
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar permanentemente el premio "${title}"?`)) {
      return;
    }

    try {
      await deleteReward(id);
      fetchRewards();
    } catch (err) {
      console.error("Error deleting reward", err);
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm("¿Restaurar catálogo oficial con las 7 suscripciones y servicios por defecto de Spatialgineers?")) {
      return;
    }
    setLoading(true);
    await resetDefaultRewards();
    await fetchRewards();
  };

  const handleAddFeature = () => {
    if (!featureInput.trim() || !editingReward) return;
    const currentFeatures = editingReward.features || [];
    setEditingReward({
      ...editingReward,
      features: [...currentFeatures, featureInput.trim()]
    });
    setFeatureInput('');
  };

  const handleRemoveFeature = (index: number) => {
    if (!editingReward || !editingReward.features) return;
    const updated = editingReward.features.filter((_, i) => i !== index);
    setEditingReward({ ...editingReward, features: updated });
  };

  if (loading) {
    return <div className="p-8 text-center text-xs font-mono text-cyan-400">Cargando Gestor de Premios y Canje...</div>;
  }

  return (
    <div className="space-y-6 font-sans text-slate-100">
      
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[var(--sgx-secondary)] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Gift className="w-5 h-5 text-[var(--sgx-neon)]" />
            <h3 className="text-base font-bold font-['Orbitron',sans-serif] text-white tracking-wide uppercase">
              ADMINISTRADOR DE PREMIOS, SERVICIOS & SUSCRIPCIONES
            </h3>
          </div>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Configura el catálogo de canje de puntos XP. Añade tus webapps, accesos VIP, licencias o mentorías.
          </p>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <button
            onClick={handleResetDefaults}
            className="px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 flex items-center space-x-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Catálogo Oficial</span>
          </button>

          <button
            onClick={handleStartCreate}
            className="px-4 py-1.5 bg-[var(--sgx-neon)] hover:bg-cyan-300 text-black font-extrabold flex items-center space-x-1.5 shadow-md transition-all"
            style={{ clipPath: 'polygon(4px 0, 100% 0, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0 100%, 0 4px)' }}
          >
            <Plus className="w-4 h-4" />
            <span>Añadir Nuevo Premio</span>
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-3 bg-amber-950 border border-[#FDCC0D] text-[#FDCC0D] text-xs font-mono flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {/* Editor Drawer / Modal if active */}
      {editingReward && (
        <div className="p-5 bg-[#171717] border-2 border-[var(--sgx-neon)] space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold font-['Orbitron',sans-serif] text-[var(--sgx-neon)] flex items-center space-x-2">
              <span>{isCreatingNew ? '✨ CREANDO NUEVO PREMIO' : '✏️ EDITANDO PREMIO'}</span>
            </h4>
            <button onClick={() => setEditingReward(null)} className="text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            
            {/* Title */}
            <div className="space-y-1">
              <label className="text-slate-400">Título del Premio / Suscripción</label>
              <input
                type="text"
                value={editingReward.title}
                onChange={(e) => setEditingReward({ ...editingReward, title: e.target.value })}
                className="w-full bg-black border border-[var(--sgx-secondary)] p-2 text-white"
                placeholder="Ej. SGX Studio 1-Yr Pro License"
              />
            </div>

            {/* Category */}
            <div className="space-y-1">
              <label className="text-slate-400">Categoría</label>
              <select
                value={editingReward.category}
                onChange={(e) => setEditingReward({ ...editingReward, category: e.target.value as RewardCategory })}
                className="w-full bg-black border border-[var(--sgx-secondary)] p-2 text-white"
              >
                <option value="WEBAPP_SUBSCRIPTION">Suscripción a WebApp / Software</option>
                <option value="SERVICE_CONSULTING">Servicio / Mentoría / Consultoría</option>
                <option value="VIP_PASS">Pase VIP / Acceso Especial</option>
                <option value="PHYSICAL_SWAG">Merchandising / Swag Físico</option>
                <option value="EARLY_ACCESS">Acceso Anticipado / Beta Tester</option>
                <option value="DIGITAL_ASSET">Asset Digital / 3D Pack</option>
              </select>
            </div>

            {/* XP Cost */}
            <div className="space-y-1">
              <label className="text-slate-400">Costo en Puntos XP</label>
              <input
                type="number"
                value={editingReward.xpCost}
                onChange={(e) => setEditingReward({ ...editingReward, xpCost: Number(e.target.value) })}
                className="w-full bg-black border border-[var(--sgx-secondary)] p-2 text-yellow-300 font-bold"
              />
            </div>

            {/* Original Value USD */}
            <div className="space-y-1">
              <label className="text-slate-400">Valor Comercial Estimado (Texto)</label>
              <input
                type="text"
                value={editingReward.originalValueUsd}
                onChange={(e) => setEditingReward({ ...editingReward, originalValueUsd: e.target.value })}
                className="w-full bg-black border border-[var(--sgx-secondary)] p-2 text-[#FDCC0D]"
                placeholder="Ej. $180 / año o Gratis"
              />
            </div>

            {/* Inventory (-1 for unlimited) */}
            <div className="space-y-1">
              <label className="text-slate-400">Cupos / Inventario (-1 = Ilimitado)</label>
              <input
                type="number"
                value={editingReward.inventoryCount}
                onChange={(e) => setEditingReward({ ...editingReward, inventoryCount: Number(e.target.value) })}
                className="w-full bg-black border border-[var(--sgx-secondary)] p-2 text-white"
              />
            </div>

            {/* Badge Emoji */}
            <div className="space-y-1">
              <label className="text-slate-400">Emoji / Icono del Premio</label>
              <input
                type="text"
                value={editingReward.badgeIcon}
                onChange={(e) => setEditingReward({ ...editingReward, badgeIcon: e.target.value })}
                className="w-full bg-black border border-[var(--sgx-secondary)] p-2 text-white"
                placeholder="⚡, 🎵, 🎁, 🚀, 💻"
              />
            </div>

            {/* Access URL */}
            <div className="space-y-1">
              <label className="text-slate-400">URL de la WebApp / Servicio</label>
              <input
                type="text"
                value={editingReward.accessUrl}
                onChange={(e) => setEditingReward({ ...editingReward, accessUrl: e.target.value })}
                className="w-full bg-black border border-[var(--sgx-secondary)] p-2 text-cyan-300"
                placeholder="https://spatialgineers.com/studio"
              />
            </div>

            {/* License Code Prefix */}
            <div className="space-y-1">
              <label className="text-slate-400">Prefijo del Voucher / Código de Licencia</label>
              <input
                type="text"
                value={editingReward.accessCodePrefix}
                onChange={(e) => setEditingReward({ ...editingReward, accessCodePrefix: e.target.value })}
                className="w-full bg-black border border-[var(--sgx-secondary)] p-2 text-white uppercase"
                placeholder="SGX-STUDIO-PRO-"
              />
            </div>

          </div>

          {/* Description */}
          <div className="space-y-1 text-xs font-mono">
            <label className="text-slate-400">Descripción detallada</label>
            <textarea
              rows={3}
              value={editingReward.description}
              onChange={(e) => setEditingReward({ ...editingReward, description: e.target.value })}
              className="w-full bg-black border border-[var(--sgx-secondary)] p-2 text-white text-xs font-mono"
              placeholder="Explica qué incluye la suscripción y cómo beneficia al usuario..."
            />
          </div>

          {/* Features Builder */}
          <div className="space-y-2 text-xs font-mono bg-black/60 p-3 border border-slate-800">
            <label className="text-slate-300 font-bold">Puntos Clave / Características Incluidas</label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={featureInput}
                onChange={(e) => setFeatureInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddFeature(); } }}
                placeholder="Ej. Acceso a 11 UberShaders en tiempo real..."
                className="flex-1 bg-slate-950 border border-slate-700 p-2 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleAddFeature}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold"
              >
                Añadir
              </button>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {editingReward.features?.map((feat, i) => (
                <span key={i} className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-slate-200 text-xs flex items-center space-x-1.5 rounded">
                  <span>{feat}</span>
                  <button type="button" onClick={() => handleRemoveFeature(i)} className="text-rose-400 hover:text-rose-200">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          {/* Active Switch & Save */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800">
            <label className="flex items-center space-x-2 text-xs font-mono cursor-pointer">
              <input
                type="checkbox"
                checked={editingReward.active}
                onChange={(e) => setEditingReward({ ...editingReward, active: e.target.checked })}
                className="rounded text-cyan-400"
              />
              <span className="text-slate-300">Premio Activo en la Tienda Pública</span>
            </label>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setEditingReward(null)}
                className="px-4 py-2 bg-slate-900 border border-slate-700 text-slate-300 text-xs font-mono"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2 bg-[var(--sgx-neon)] hover:bg-cyan-300 text-black font-mono font-black text-xs shadow-lg flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Premio</span>
              </button>
            </div>
          </div>

        </div>
      )}

      {/* Rewards Catalog Table / Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rewards.map((reward) => (
          <div
            key={reward.id}
            className={`p-4 border transition-all flex flex-col justify-between ${
              reward.active 
                ? 'bg-[#181818] border-[var(--sgx-secondary)] hover:border-[var(--sgx-neon)]/60' 
                : 'bg-black/60 border-slate-800 opacity-60'
            }`}
            style={{ clipPath: 'polygon(8px 0, 100% 0, 100% calc(100% - 8px), calc(100% - 8px) 100%, 0 100%, 0 8px)' }}
          >
            <div>
              <div className="flex items-start justify-between">
                <span className="text-2xl p-1.5 bg-black border border-slate-800 rounded">
                  {reward.badgeIcon || '⚡'}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 border font-bold uppercase ${
                  reward.active ? 'bg-amber-950 border-[#FDCC0D] text-[#FDCC0D]' : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}>
                  {reward.active ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </div>

              <h4 className="text-sm font-bold text-white font-['Orbitron',sans-serif] mt-2">
                {reward.title}
              </h4>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">{reward.description}</p>

              <div className="mt-3 flex items-center justify-between text-xs font-mono">
                <span className="text-yellow-400 font-bold">{reward.xpCost} XP</span>
                <span className="text-[#FDCC0D]">{reward.originalValueUsd}</span>
              </div>
              <div className="text-[11px] font-mono text-slate-500 mt-1">
                Stock: {reward.inventoryCount === -1 ? 'Ilimitado' : `${reward.inventoryCount} cupos`} • Canjeados: {reward.claimedCount}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between font-mono text-xs">
              <button
                onClick={() => handleStartEdit(reward)}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-cyan-300 flex items-center space-x-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar</span>
              </button>

              <button
                onClick={() => handleDelete(reward.id, reward.title)}
                className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900 border border-rose-800 text-rose-300 flex items-center space-x-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};
