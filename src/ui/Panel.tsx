/**
 * Panel — componente de card reutilizável.
 * Usado dentro do Shadow DOM do Dashboard.
 */

import { h } from 'preact';
import type { ComponentChildren } from 'preact';

interface PanelProps {
  title: string;
  children: ComponentChildren;
  action?: { label: string; onClick: () => void };
  class?: string;
}

export function Panel({ title, children, action, class: cls }: PanelProps) {
  return (
    <div class={`sc-panel ${cls ?? ''}`.trim()}>
      <div class="sc-panel-header">
        <h3 class="sc-panel-title">{title}</h3>
        {action && (
          <button class="sc-btn sc-btn-sm" type="button" onClick={action.onClick}>
            {action.label}
          </button>
        )}
      </div>
      <div class="sc-panel-body">{children}</div>
    </div>
  );
}
