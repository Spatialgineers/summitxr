import React, { useState } from 'react';
import { PRISMA_SCHEMA_SPEC, POSTGRESQL_DDL, MONGODB_SCHEMA_SPEC } from '../../lib/schemas';
import { Database, Network, Copy, Check, Calculator, Workflow, Layers, ShieldCheck } from 'lucide-react';

export const DatabaseSchemaViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PRISMA' | 'SQL' | 'MONGODB' | 'WEBSOCKET' | 'GAMIFICATION'>('PRISMA');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const wsProtocolDoc = `// =========================================================================
// SGX LIVE ENGINE - WEBSOCKET PROTOCOL & STATE MACHINE SPECIFICATION
// Standard Port: 3000 | Endpoint: ws://domain.com/ws?tenantId=...&eventId=...
// =========================================================================

1. CLIENT -> SERVER (VOTE SUBMISSION)
-------------------------------------------------------------------------
A. Lightweight Binary Buffer (Optimized for Crowded Cellular Arenas):
   - Format: 1-Byte UInt8 (0x01 = Option A, 0x02 = Option B, 0x03 = Option C, 0x04 = Option D)
   - Payload Size: Exactly 1 Byte (99.2% smaller than JSON)

B. Standard JSON Packet:
{
  "type": "VOTE_SUBMIT",
  "tenantId": "tenant_spatialgineers",
  "eventId": "event_live_main",
  "timestamp": 1771234567890,
  "payload": {
    "userId": "user_94f8b2c",
    "nickname": "CyberRider",
    "questionId": "q_001",
    "optionId": "opt_a",
    "optionCode": 1,
    "responseTimeMs": 1420
  }
}

2. SERVER -> BROADCAST (QUESTION START / TICK / SUMMARY)
-------------------------------------------------------------------------
A. "QUESTION_START"
{
  "type": "QUESTION_START",
  "tenantId": "tenant_spatialgineers",
  "eventId": "event_live_main",
  "timestamp": 1771234567890,
  "payload": {
    "question": {
      "id": "q_001",
      "prompt": "Which dimension should our live stage warp into next?",
      "category": "CYOA Dimension Shift",
      "answerType": "OPINION_CYOA",
      "durationSeconds": 30,
      "options": [
        { "id": "opt_a", "code": 1, "label": "A: Synthwave Grid", "presetId": "preset_neon_grid", "color": "#00ddff" },
        { "id": "opt_b", "code": 2, "label": "B: Inferno Volcano", "presetId": "preset_volcano_fire", "color": "#ff3b30" }
      ]
    },
    "durationSeconds": 30,
    "endTime": 1771234597890
  }
}

B. "COUNTDOWN_TICK" (Emitted every 1000ms by Server Source of Truth)
{
  "type": "COUNTDOWN_TICK",
  "payload": {
    "questionId": "q_001",
    "timeRemaining": 14,
    "totalDuration": 30
  }
}

C. "VOTE_SUMMARY" (Emitted on window close)
{
  "type": "VOTE_SUMMARY",
  "payload": {
    "summary": {
      "questionId": "q_001",
      "totalVotes": 4200,
      "optionCounts": { "opt_a": 2800, "opt_b": 1400 },
      "optionPercentages": { "opt_a": 67, "opt_b": 33 },
      "winningOptionId": "opt_a",
      "winningPresetId": "preset_neon_grid"
    },
    "winningPreset": {
      "id": "preset_neon_grid",
      "name": "Synthwave Cyber Grid",
      "shaderKey": "grid"
    },
    "storyNarrative": "Audience consensus has initiated the Synthwave dimensional warp!"
  }
}

D. "PRESET_TRIGGER" (Pushed directly to Three.js Canvas Render Plane)
{
  "type": "PRESET_TRIGGER",
  "payload": {
    "presetId": "preset_neon_grid",
    "source": "WINNER_VOTE"
  }
}
`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400 uppercase">
              <Database className="w-4 h-4" />
              <span>Technical Architecture Specifications</span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-1">
              Database Schemas & Protocol Blueprints
            </h1>
          </div>

          <button
            onClick={() => {
              let textToCopy = '';
              if (activeTab === 'PRISMA') textToCopy = PRISMA_SCHEMA_SPEC;
              else if (activeTab === 'SQL') textToCopy = POSTGRESQL_DDL;
              else if (activeTab === 'MONGODB') textToCopy = MONGODB_SCHEMA_SPEC;
              else if (activeTab === 'WEBSOCKET') textToCopy = wsProtocolDoc;
              handleCopy(textToCopy);
            }}
            className="flex items-center space-x-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all shadow-lg shadow-cyan-500/20"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Specification!' : 'Copy Code Blueprint'}</span>
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-3">
          {[
            { id: 'PRISMA', label: 'Prisma Schema', icon: Layers },
            { id: 'SQL', label: 'PostgreSQL DDL', icon: Database },
            { id: 'MONGODB', label: 'MongoDB Mongoose', icon: Database },
            { id: 'WEBSOCKET', label: 'WebSocket Protocol', icon: Network },
            { id: 'GAMIFICATION', label: 'Gamification Math', icon: Calculator },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-mono font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Code Content Container */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          {activeTab === 'PRISMA' && (
            <pre className="text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre leading-relaxed p-4 bg-slate-950 rounded-xl border border-slate-800/80">
              {PRISMA_SCHEMA_SPEC}
            </pre>
          )}

          {activeTab === 'SQL' && (
            <pre className="text-xs font-mono text-[#FDCC0D] overflow-x-auto whitespace-pre leading-relaxed p-4 bg-slate-950 rounded-xl border border-slate-800/80">
              {POSTGRESQL_DDL}
            </pre>
          )}

          {activeTab === 'MONGODB' && (
            <pre className="text-xs font-mono text-[#FDCC0D] overflow-x-auto whitespace-pre leading-relaxed p-4 bg-slate-950 rounded-xl border border-slate-800/80">
              {MONGODB_SCHEMA_SPEC}
            </pre>
          )}

          {activeTab === 'WEBSOCKET' && (
            <pre className="text-xs font-mono text-[#FDCC0D] overflow-x-auto whitespace-pre leading-relaxed p-4 bg-slate-950 rounded-xl border border-slate-800/80">
              {wsProtocolDoc}
            </pre>
          )}

          {activeTab === 'GAMIFICATION' && (
            <div className="space-y-6">
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <Calculator className="w-5 h-5 text-[#FDCC0D]" />
                  <span>Core Gamification Point Formulation</span>
                </h3>
                <div className="p-4 bg-slate-900 rounded-xl font-mono text-sm text-[#FDCC0D] border border-slate-800">
                  $$Points = (Accuracy \times BasePoints) + SpeedBonus + ParticipationWeight$$
                </div>

                <div className="space-y-2 text-xs font-mono text-slate-300">
                  <p>• <span className="text-[#FDCC0D] font-bold">Accuracy Factor:</span> In <span className="text-white">OPINION_CYOA</span> mode, Accuracy = 1 (every attendee contributes to shaping the story). In <span className="text-[#FDCC0D]">KNOWLEDGE</span> mode, Accuracy = 1 if correct, else 0.</p>
                  <p>• <span className="text-[#FDCC0D] font-bold">Speed Bonus:</span> Calculated with continuous decaying response time: SpeedBonus = max(0, (1 - responseTime / totalDuration) * MaxSpeedBonus)</p>
                  <p>• <span className="text-[#FDCC0D] font-bold">Streak Multiplier:</span> Consecutive correct or active responses scale the multiplier from 1.0x to 1.25x, 1.5x, 1.75x, up to 2.0x (Hypercharge).</p>
                  <p>• <span className="text-[#FDCC0D] font-bold">Total Awarded Points:</span> Total = Math.round((Base + SpeedBonus + Participation) * StreakMultiplier)</p>
                </div>
              </div>

              {/* Prize Tier Architecture */}
              <div className="p-5 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
                <h3 className="text-base font-bold text-white flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-[#FDCC0D]" />
                  <span>Perk & Reward Tier System</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-amber-400 font-bold block">🥉 Bronze (100+ pts)</span>
                    <span className="text-slate-400 block mt-1">Digital Souvenir Badge + Community Wallpaper</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-slate-300 font-bold block">🥈 Silver (350+ pts)</span>
                    <span className="text-slate-400 block mt-1">15% Merch Discount QR Voucher</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-yellow-400 font-bold block">🥇 Gold (750+ pts)</span>
                    <span className="text-slate-400 block mt-1">Exclusive 3D Avatar Asset Pack + Audio Track</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800">
                    <span className="text-cyan-400 font-bold block">💎 Platinum (1,200+ pts)</span>
                    <span className="text-slate-400 block mt-1">Free Hologram Print Voucher</span>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 md:col-span-2">
                    <span className="text-[var(--sgx-accent)] font-bold block">👑 VIP Backstage (1,600+ pts)</span>
                    <span className="text-slate-400 block mt-1">OBS Stage Jumbotron Live Shoutout + VIP Lounge Pass</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
