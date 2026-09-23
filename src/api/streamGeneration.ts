export interface StreamSession {
  isCurrent(): boolean;
}

export interface StreamGenerationGuard {
  begin(): StreamSession;
  invalidate(): void;
}

export function createStreamGenerationGuard(): StreamGenerationGuard {
  let generation = 0;
  return {
    begin() {
      const ownGeneration = ++generation;
      return { isCurrent: () => ownGeneration === generation };
    },
    invalidate() { generation += 1; },
  };
}

