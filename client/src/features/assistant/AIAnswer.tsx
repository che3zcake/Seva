import { Sparkles, BookText } from 'lucide-react';
import type { AIExplanation } from '@seva/shared';

/**
 * The label matters as much as the text: a citizen should always be able to
 * tell an explanation apart from a requirement. Requirements come from the
 * service checklist; this box only ever explains them.
 */
export function AIAnswer({ explanation }: { explanation: AIExplanation }) {
  const isAI = explanation.source === 'ai';

  return (
    <div className="rounded-xl border border-info/25 bg-info-soft p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-info">
        {isAI ? <Sparkles size={14} aria-hidden /> : <BookText size={14} aria-hidden />}
        {isAI ? 'AI explanation' : 'Explanation'}
      </p>
      <p className="mt-2 whitespace-pre-line text-ink">{explanation.answer}</p>
      {explanation.sentToModel ? (
        <details className="mt-3 border-t border-info/20 pt-3">
          <summary className="cursor-pointer text-xs font-medium text-info">
            What was sent to the AI
          </summary>
          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap rounded-lg bg-surface p-3 text-xs text-muted">
            {explanation.sentToModel}
          </pre>
          <p className="mt-2 text-xs text-muted">
            Your name, and the name printed on your documents, are deliberately not in here.
          </p>
        </details>
      ) : null}
      <p className="mt-3 border-t border-info/20 pt-3 text-xs text-muted">
        {explanation.disclaimer}
      </p>
    </div>
  );
}
