// Legacy indentation-based text format (kept so old .txt files can still be imported).
// The default treatment list and the preferred import/export format is JSON: see treatment-json.ts

export interface ParsedTreatment {
  name: string;
  cost: number;
  duration: number;
  depth: number;
}

export interface ParsedTree {
  name: string;
  treatments: ParsedTreatment[];
}

export function parseTreatmentFile(content: string): ParsedTree[] {
  const trees: ParsedTree[] = [];
  let currentTree: ParsedTree | null = null;

  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (trimmed.startsWith('TREE:')) {
      const name = trimmed.substring(5).trim();
      currentTree = { name, treatments: [] };
      trees.push(currentTree);
      continue;
    }

    if (!currentTree) continue;

    // Count leading spaces for depth
    const leadingSpaces = line.length - line.trimStart().length;
    const depth = Math.floor(leadingSpaces / 2);

    // Parse: name | cost | duration
    const parts = trimmed.split('|').map(p => p.trim());
    const name = parts[0];
    const cost = parts[1] ? parseInt(parts[1], 10) : 0;
    const duration = parts[2] ? parseInt(parts[2], 10) : 30;

    currentTree.treatments.push({ name, cost, duration, depth });
  }

  return trees;
}
