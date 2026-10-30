// SGX Entrepreneur Match (SGX.MATCH) - Deterministic Matching & Reason Engine

import { MatchProfile, MatchCandidate, MatchSeekingChip, MatchBringChip } from './match.types';

/**
 * Complementary-needs mapping table
 * Viewer's seeking requirement -> satisfied by candidate's brings/role
 */
export function isNeedSatisfied(seeking: MatchSeekingChip, candidate: MatchProfile): boolean {
  const brings = candidate.brings || [];
  const openTo = candidate.openTo || [];

  switch (seeking) {
    case 'cofounder':
      // Satisfied by technical, 3d_xr, design, or sales
      return brings.some(b => ['technical', '3d_xr', 'design', 'sales'].includes(b));

    case 'investor':
      // Satisfied by capital or openTo invest
      return brings.includes('capital') || openTo.includes('invest');

    case 'client':
      // Candidate brings capital/network or seeks vendors/solutions
      return brings.includes('capital') || brings.includes('network') || candidate.seeking.includes('vendor');

    case 'collaborator':
      // Overlapping pillar or complementary brings
      return brings.some(b => ['technical', 'design', '3d_xr', 'audio', 'content', 'community'].includes(b));

    case 'sponsor':
      // Candidate openTo partner/invest and brings capital/network
      return (openTo.includes('partner') || openTo.includes('invest')) && 
             (brings.includes('capital') || brings.includes('network'));

    case 'vendor':
      // Candidate brings technical, 3d_xr, audio, content, design, legal_ops
      return brings.some(b => ['technical', '3d_xr', 'audio', 'content', 'design', 'legal_ops'].includes(b));

    case 'mentor':
      // Candidate brings mentorship
      return brings.includes('mentorship');

    case 'talent':
      // Candidate openTo hire or brings high-demand skill
      return openTo.includes('hire') || brings.some(b => ['technical', 'design', '3d_xr', 'audio', 'sales'].includes(b));

    default:
      return false;
  }
}

/**
 * Check if candidate's seeking is satisfied by viewer's brings (reciprocity)
 */
export function isReciprocalNeedSatisfied(viewer: MatchProfile, candidate: MatchProfile): boolean {
  return candidate.seeking.some(candSeek => isNeedSatisfied(candSeek, viewer));
}

/**
 * Check if viewers have adjacent/related pillars
 */
function isAdjacentPillar(p1: string, p2: string): boolean {
  const adjacencyMap: Record<string, string[]> = {
    story: ['spark', 'synthesize'],
    showcase: ['spark', 'stage'],
    spark: ['story', 'showcase'],
    stage: ['showcase', 'systems'],
    systems: ['stage', 'synthesize'],
    synthesize: ['systems', 'story']
  };
  return adjacencyMap[p1]?.includes(p2) || false;
}

/**
 * Calculate match fit score between 0 and 100
 */
export function calculateMatchScore(
  viewer: MatchProfile,
  candidate: MatchProfile,
  lang: 'es' | 'en' = 'es'
): { score: number; reason: string } {
  const es = lang === 'es';
  // 1. Demand met (viewer's seeking satisfied by candidate)
  const viewerDemandMet = viewer.seeking.some(s => isNeedSatisfied(s, candidate));

  // 2. Reciprocity (candidate's seeking satisfied by viewer)
  const reciprocityMet = isReciprocalNeedSatisfied(viewer, candidate);

  // 3. Pillar alignment
  const samePillar = viewer.pillar === candidate.pillar;
  const adjacentPillar = !samePillar && isAdjacentPillar(viewer.pillar, candidate.pillar);

  // 4. OpenTo overlap ratio
  const viewerOpenTo = viewer.openTo || [];
  const candidateOpenTo = candidate.openTo || [];
  const sharedOpenTo = viewerOpenTo.filter(tag => candidateOpenTo.includes(tag));
  const maxOpenTo = Math.max(1, Math.max(viewerOpenTo.length, candidateOpenTo.length));
  const openToRatio = sharedOpenTo.length / maxOpenTo;

  // Compute raw score
  let rawScore = 0;
  rawScore += viewerDemandMet ? 50 : 0;
  rawScore += reciprocityMet ? 25 : 0;
  rawScore += samePillar ? 15 : adjacentPillar ? 6 : 0;
  rawScore += Math.round(openToRatio * 10);

  // Floor cards low if neither direction's need is met
  if (!viewerDemandMet && !reciprocityMet) {
    rawScore = Math.min(20, rawScore);
  }

  // Fairness nudge: lightly boost profiles with zero received intents
  if ((candidate.receivedIntentCount || 0) === 0) {
    rawScore += 5;
  }

  // Clamp score between 15 and 99 (or 100 if both demand + reciprocity + same pillar)
  const finalScore = Math.min(100, Math.max(15, rawScore));

  // Generate 1-line reason
  let reason = '';
  if (viewerDemandMet && reciprocityMet) {
    reason = es ? 'Match mutuo — cada quien tiene lo que el otro busca' : 'Mutual match — each of you has what the other is looking for';
  } else if (viewerDemandMet) {
    const matchedRole = viewer.seeking.find(s => isNeedSatisfied(s, candidate)) || viewer.seeking[0];
    const roleLabels: Record<string, string> = es ? {
      cofounder: 'co-fundador',
      investor: 'inversionista',
      client: 'clientes',
      collaborator: 'colaborador',
      sponsor: 'patrocinador',
      vendor: 'proveedor',
      mentor: 'mentor',
      talent: 'talento'
    } : { cofounder: 'a co-founder', investor: 'an investor', client: 'clients', collaborator: 'a collaborator', sponsor: 'a sponsor', vendor: 'a vendor', mentor: 'a mentor', talent: 'talent' };
    reason = es ? `Buscas ${roleLabels[matchedRole] || matchedRole}, y ellos lo traen` : `You're looking for ${roleLabels[matchedRole] || matchedRole}, and they bring it`;
  } else if (reciprocityMet) {
    reason = es ? 'Buscan lo que tú traes a la mesa' : 'They need what you bring to the table';
  } else if (samePillar) {
    reason = `${es ? 'Mismo pilar SGX' : 'Same SGX pillar'}: ${viewer.pillar.toUpperCase()}`;
  } else if (sharedOpenTo.length > 0) {
    reason = es ? `Ambos abiertos a conectar (${sharedOpenTo[0]})` : `Both open to connect (${sharedOpenTo[0]})`;
  } else {
    reason = es ? 'Energía complementaria en Chroma Space' : 'Complementary energy at Chroma Space';
  }

  return { score: finalScore, reason };
}

/**
 * Score and sort a candidate deck against the viewer profile
 */
export function rankCandidatesDeck(
  viewer: MatchProfile,
  candidates: MatchCandidate[],
  lang: 'es' | 'en' = 'es'
): MatchCandidate[] {
  return candidates
    .map(c => {
      const { score, reason } = calculateMatchScore(viewer, c.profile, lang);
      return {
        ...c,
        score,
        matchReason: reason
      };
    })
    .sort((a, b) => {
      // 1. Sort by score desc
      const scoreDiff = (b.score || 0) - (a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;

      // 2. Sort by active XP desc
      const xpDiff = (b.xp || 0) - (a.xp || 0);
      if (xpDiff !== 0) return xpDiff;

      // 3. Stable pseudo-random shuffle for ties
      return a.uid.localeCompare(b.uid);
    });
}
