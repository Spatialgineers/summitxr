import React, { useCallback, useEffect, useState } from 'react';
import { collection, getCountFromServer, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import { Trophy } from 'lucide-react';
import { db, auth } from '../../../lib/firebase';
import { SgxDialog } from '../../common/SgxDialog';
import type { LeaderboardEntry } from '../../../types/pilot';

/* Drone ranking: top 10 of pilot_leaderboard by droneHighScore (rows are
   written by PilotProfileContext when a signed-in Creador finishes a run).
   Only the first name is shown. */

export interface DroneRankRow { uid: string; name: string; score: number; isMe: boolean }

export interface DroneRanking {
  status: 'loading' | 'ready' | 'error';
  rows: DroneRankRow[];
  /** 1-based place for `myBest`, null when there is no score yet. */
  myRank: number | null;
  reload: () => void;
}

const TIMEOUT_MS = 8000;

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS))]);
}

export function firstName(raw: string | undefined): string {
  const first = (raw || '').trim().split(/\s+/)[0] || '';
  return first.slice(0, 16) || 'Creador';
}

export function useDroneRanking(active: boolean, myBest: number): DroneRanking {
  const [status, setStatus] = useState<DroneRanking['status']>('loading');
  const [rows, setRows] = useState<DroneRankRow[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    setStatus('loading');
    const board = collection(db, 'pilot_leaderboard');
    const me = auth.currentUser?.uid;
    const top = withTimeout(getDocs(query(board, orderBy('droneHighScore', 'desc'), limit(10)))).then((snap) => {
      // Offline reads come back empty from the cache: that is "unavailable", not "no scores".
      if (snap.empty && snap.metadata.fromCache) throw new Error('offline');
      return snap.docs
        .map((d) => d.data() as LeaderboardEntry)
        .filter((e) => (e.droneHighScore || 0) > 0)
        .map((e) => ({ uid: e.uid, name: firstName(e.nickname), score: e.droneHighScore, isMe: !!me && e.uid === me }));
    });
    const rank = myBest > 0
      ? withTimeout(getCountFromServer(query(board, where('droneHighScore', '>', myBest)))).then((c) => c.data().count + 1).catch(() => null)
      : Promise.resolve(null);
    Promise.all([top, rank])
      .then(([list, place]) => {
        if (!alive) return;
        setRows(list);
        setMyRank(place);
        setStatus('ready');
      })
      .catch(() => alive && setStatus('error'));
    return () => { alive = false; };
  }, [active, myBest, nonce]);

  return { status, rows, myRank, reload };
}

interface RankingListProps { ranking: DroneRanking; es: boolean; myBest: number }

export const DroneRankingList: React.FC<RankingListProps> = ({ ranking, es, myBest }) => {
  const { status, rows, myRank, reload } = ranking;
  return (
    <div className="sgx-drone-rank">
      <div className="sgx-drone-rank__me">
        <div>
          <span>{es ? 'Tu mejor puntaje' : 'Your best score'}</span>
          <b>{myBest > 0 ? `${myBest.toLocaleString(es ? 'es-PR' : 'en-US')} pts` : '—'}</b>
        </div>
        <div>
          <span>{es ? 'Tu puesto' : 'Your place'}</span>
          <b>{myRank ? `#${myRank}` : '—'}</b>
        </div>
      </div>
      {status === 'loading' && <p className="sgx-drone-rank__note" role="status">{es ? 'Cargando ranking…' : 'Loading ranking…'}</p>}
      {status === 'error' && (
        <div className="sgx-drone-rank__note" role="status">
          <p>{es ? 'No pudimos cargar el ranking ahora mismo.' : "We couldn't load the ranking right now."}</p>
          <button type="button" className="sgx-btn sgx-btn--sm sgx-btn--ground" onClick={reload}>{es ? 'Reintentar' : 'Retry'}</button>
        </div>
      )}
      {status === 'ready' && rows.length === 0 && (
        <p className="sgx-drone-rank__note">{es ? 'Todavía nadie tiene puntaje. Juega una partida y sé el primero.' : 'No scores yet. Play a run and be the first.'}</p>
      )}
      {status === 'ready' && rows.length > 0 && (
        <ol className="sgx-drone-rank__list">
          {rows.map((r, i) => (
            <li key={r.uid} className={r.isMe ? 'is-me' : ''}>
              <span className="sgx-drone-rank__pos">{String(i + 1).padStart(2, '0')}</span>
              <span className="sgx-drone-rank__name">{r.name}{r.isMe ? (es ? ' · tú' : ' · you') : ''}</span>
              <b>{r.score.toLocaleString(es ? 'es-PR' : 'en-US')}</b>
            </li>
          ))}
        </ol>
      )}
      <p className="sgx-drone-rank__fine">
        {es ? 'Para aparecer en el ranking entra con tu cuenta; se guarda tu mejor partida.' : 'Sign in to appear in the ranking; your best run is saved.'}
      </p>
    </div>
  );
};

interface DialogProps { open: boolean; onClose: () => void; onPlay: () => void; ranking: DroneRanking; es: boolean; myBest: number }

export const DroneRankingDialog: React.FC<DialogProps> = ({ open, onClose, onPlay, ranking, es, myBest }) => {
  if (!open) return null;
  return (
    <SgxDialog
      open
      onClose={onClose}
      size="sm"
      title={es ? 'Ranking del dron' : 'Drone ranking'}
      kicker={es ? 'Top 10 por mejor puntaje' : 'Top 10 by best score'}
      icon={<Trophy className="w-5 h-5 text-[#FDCC0D]" aria-hidden />}
      footer={
        <button type="button" className="sgx-btn sgx-btn--sm" onClick={() => { onClose(); onPlay(); }}>
          {es ? 'Jugar' : 'Play'}
        </button>
      }
    >
      <DroneRankingList ranking={ranking} es={es} myBest={myBest} />
    </SgxDialog>
  );
};
