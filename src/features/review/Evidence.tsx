import type { SourceCitation, SourceDocument } from '../../domain/types';
export function Evidence({ source, documents }: { source: SourceCitation; documents: SourceDocument[] }) {
  const document = documents.find((item) => item.id === source.documentId);
  if (!document) return <p className="error">Source unavailable.</p>;
  const before = document.content.slice(0, source.start), evidence = document.content.slice(source.start, source.end), after = document.content.slice(source.end);
  return <details className="evidence"><summary>View evidence · {document.title}</summary><blockquote>{before}<mark>{evidence}</mark>{after}</blockquote><p className="source-meta">Characters {source.start}–{source.end}</p></details>;
}

