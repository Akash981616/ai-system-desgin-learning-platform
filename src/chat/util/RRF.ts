import { Document } from '@langchain/core/documents';

export function reciprocalRankFusion(results: Document[][], k = 60) {
  const fusedScores = new Map();
  for (const docs of results) {
    docs.forEach((doc, index) => {
      const key = doc.pageContent;
      const previousScore = fusedScores.get(key) || 0;
      const rank = index + 1;
      fusedScores.set(key, previousScore + 1 / (k + rank));
    });
  }

  const reranked = Array.from(fusedScores.entries()).map(([key, score]) => {
    return {
      doc: results.flat().find((doc) => doc.pageContent === key),
      score,
    };
  });
  return reranked.sort((a, b) => b.score - a.score);
}
