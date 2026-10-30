import { useCallback, useEffect, useState } from 'react';
import { collection, doc, getCountFromServer, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { auth, db } from './firebase';

/* GAME SCORES for the SGX.Spark games: game_scores/{gameId}/players/{uid}
   holds each Creador's best score (rules: only your own row, the best only
   goes up). Rankings read the top 10 and count who is above you. Only the
   first name is public. */

export type SparkGameId = 'stack' | 'pulse' | 'bolt';
export const SPARK_GAMES: SparkGameId[] = ['stack', 'pulse', 'bolt'];

export interface GameRankRow { uid: string; name: string; score: number; isMe: boolean }
export interface GameRanking {
  status: 'loading' | 'ready' | 'error';
  rows: GameRankRow[];
  myBest: number;
  /** 1-based place, null when you have no score yet. */
  myRank: number | null;
  reload: () => void;
}

const TIMEOUT_MS = 8000;
const withTimeout = <T,>(p: Promise<T>): Promise<T> =>
  Promise.race([p, new Promise<T>((_, reject) => window.setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS))]);

const firstName = (raw?: string) => ((raw || '').trim().split(/\s+/)[0] || 'Creador').slice(0, 16);
const board = (game: SparkGameId) => collection(db, 'game_scores', game, 'players');

/** Saves the score if it beats your best. Resolves to the (new) best. Never throws. */
export async function submitGameScore(game: SparkGameId, score: number, name: string): Promise<number> {
  const uid = auth.currentUser?.uid;
  const s = Math.max(0, Math.min(10_000_000, Math.round(score)));
  if (!uid || s <= 0) return s;
  try {
    const ref = doc(db, 'game_scores', game, 'players', uid);
    const prev = await withTimeout(getDoc(ref));
    const best = prev.exists() ? Number(prev.data().score) || 0 : 0;
    if (s <= best) return best;
    await setDoc(ref, { uid, name: firstName(name), score: s, updatedAt: serverTimestamp() });
    return s;
  } catch {
    return s;
  }
}

export function useGameRanking(game: SparkGameId, active: boolean): GameRanking {
  const [state, setState] = useState<Omit<GameRanking, 'reload'>>({ status: 'loading', rows: [], myBest: 0, myRank: null });
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!active) return;
    let alive = true;
    setState((s) => ({ ...s, status: 'loading' }));
    const me = auth.currentUser?.uid;
    (async () => {
      const snap = await withTimeout(getDocs(query(board(game), orderBy('score', 'desc'), limit(10))));
      if (snap.empty && snap.metadata.fromCache) throw new Error('offline');
      const rows = snap.docs.map((d) => d.data()).map((e) => ({ uid: String(e.uid), name: firstName(e.name), score: Number(e.score) || 0, isMe: !!me && e.uid === me }));
      let myBest = 0;
      let myRank: number | null = null;
      if (me) {
        const mine = await withTimeout(getDoc(doc(db, 'game_scores', game, 'players', me))).catch(() => null);
        myBest = mine?.exists() ? Number(mine.data().score) || 0 : 0;
        if (myBest > 0) myRank = await withTimeout(getCountFromServer(query(board(game), where('score', '>', myBest)))).then((c) => c.data().count + 1).catch(() => null);
      }
      if (alive) setState({ status: 'ready', rows, myBest, myRank });
    })().catch(() => alive && setState((s) => ({ ...s, status: 'error' })));
    return () => { alive = false; };
  }, [game, active, nonce]);

  return { ...state, reload };
}
