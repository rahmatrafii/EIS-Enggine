// Guard helper: nilai non-number, null, undefined, atau NaN dianggap 0
const safe = (val) => (typeof val !== 'number' || isNaN(val) ? 0 : val);

export const calculateKnowledgeGain = (preScore, postScore) => {
  const _pre = safe(preScore);
  const _post = safe(postScore);
  const gain = _post - _pre;
  return gain > 0 ? gain : 0;
};

export const calculateEngagementScore = (durationSeconds, exhibitsVisited, mediaClicked, hasLabActivity) => {
  const _duration = safe(durationSeconds);
  const _exhibits = safe(exhibitsVisited);
  const _media = safe(mediaClicked);
  const durationPoints = Math.min(50, Math.floor(_duration / 300));
  const exhibitPoints = Math.min(20, _exhibits * 2);
  const mediaPoints = Math.min(20, _media * 5);
  const labBonus = hasLabActivity ? 10 : 0;

  return Math.min(100, durationPoints + exhibitPoints + mediaPoints + labBonus);
};

export const calculateRetentionScore = (score1w, score1m) => {
  const has1w = score1w !== null && score1w !== undefined;
  const has1m = score1m !== null && score1m !== undefined;

  if (has1w && has1m) {
    return Math.round((safe(score1w) + safe(score1m)) / 2);
  }

  if (has1w) {
    return Math.round(safe(score1w) * 0.5);
  }

  return 0;
};

export const calculateFinalEis = (knowledgeGain, engagement, retention) => {
  const _kg = safe(knowledgeGain);
  const _eng = safe(engagement);
  const _ret = safe(retention);
  const final = (_kg * 0.40) + (_eng * 0.35) + (_ret * 0.25);
  return Math.round(final);
};

export const assignGrade = (finalScore) => {
  const _score = safe(finalScore);
  if (_score >= 90) return { grade: 'S', badge: 'Naturalis Master' };
  if (_score >= 75) return { grade: 'A', badge: 'Penjelajah Konservasi' };
  if (_score >= 60) return { grade: 'B', badge: 'Pengamat Satwa' };
  if (_score >= 45) return { grade: 'C', badge: 'Pengunjung Aktif' };
  return { grade: 'D', badge: 'Penjelajah Pemula' };
};
