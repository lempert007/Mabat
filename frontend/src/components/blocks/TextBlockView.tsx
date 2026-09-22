import ReactMarkdown from 'react-markdown';
import type { TextBlock } from '@/types/api';

export function TextBlockView({ block }: { block: TextBlock }) {
  return (
    <div className="prose-dark">
      <ReactMarkdown>{block.markdown}</ReactMarkdown>
    </div>
  );
}
