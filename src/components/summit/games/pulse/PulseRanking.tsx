import React from 'react';
import { Trophy } from 'lucide-react';
import { SgxDialog } from '../../../common/SgxDialog';
import type { GameRanking } from '../../../../lib/gameScores';

/* Pulso SGX ranking: top 10 of game_scores/pulse plus your best and place. */

const fmt = (n: number, es: boolean) => n.toLocaleString(es ? 'es-PR' : 'en-US');

export const PulseRankingList: React.FC<{ ranking: GameRanking; es: boolean; myBest: number }> = ({ ranking, es, myBest }) => {
  const { status, rows, myRank, reload } = ranking;
  return (
    <div className="sgx-pulse-rank">
      <div className="sgx-pulse-rank__me">
        <div><span>{es ? 'Tu mejor' : 'Your best'}</span><b>{myBest > 0 ? `${fmt(myBest, es)} pts` : '—'}</b></div>
        <div><span>{es ? 'Tu puesto' : 'Your place'}</span><b>{myRank ? `#${myRank}` : '—'}</b></div>
      </div>
      {status === 'loading' && <p className="sgx-pulse-rank__note" role="status">{es ? 'Cargando ranking…' : 'Loading ranking…'}</p>}
      {status === 'error' && (
        <div className="sgx-pulse-rank__note" role="status">
          <p>{es ? 'No pudimos cargar el ranking ahora mismo.' : "We couldn't load the ranking right now."}</p>
          <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={reload}>{es ? 'Reintentar' : 'Retry'}</button>
        </div>
      )}
      {status === 'ready' && rows.length === 0 && (
        <p className="sgx-pulse-rank__note">{es ? 'Todavía nadie tiene puntaje. Toca una canción y sé el primero.' : 'No scores yet. Play a song and be the first.'}</p>
      )}
      {status === 'ready' && rows.length > 0 && (
        <ol className="sgx-pulse-rank__list">
          {rows.map((r, i) => (
            <li key={r.uid} className={r.isMe ? 'is-me' : ''}>
              <span className="sgx-pulse-rank__pos">{String(i + 1).padStart(2, '0')}</span>
              <span className="sgx-pulse-rank__name">{r.name}{r.isMe ? (es ? ' · tú' : ' · you') : ''}</span>
              <b>{fmt(r.score, es)}</b>
            </li>
          ))}
        </ol>
      )}
      <p className="sgx-pulse-rank__fine">{es ? 'Se guarda tu mejor partida (todas las dificultades comparten ranking).' : 'Your best run is saved (all difficulties share one ranking).'}</p>
    </div>
  );
};

interface DialogProps { open: boolean; onClose: () => void; onPlay: () => void; ranking: GameRanking; es: boolean; myBest: number }

export const PulseRankingDialog: React.FC<DialogProps> = ({ open, onClose, onPlay, ranking, es, myBest }) => {
  if (!open) return null;
  return (
    <SgxDialog
      open
      onClose={onClose}
      size="sm"
      title={es ? 'Ranking de Pulso SGX' : 'SGX Pulse ranking'}
      kicker={es ? 'Top 10 por mejor puntaje' : 'Top 10 by best score'}
      icon={<Trophy className="w-5 h-5 text-[#FDCC0D]" aria-hidden />}
      footer={<button type="button" className="sgx-btn sgx-btn--sm" onClick={() => { onClose(); onPlay(); }}>{es ? 'Jugar' : 'Play'}</button>}
    >
      <PulseRankingList ranking={ranking} es={es} myBest={myBest} />
    </SgxDialog>
  );
};
