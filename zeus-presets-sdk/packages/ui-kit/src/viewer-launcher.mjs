/**
 * Reusable SSR controls for opening @zeus/view-ui deep links.
 */

import { a, button, details, summary, div, span, ul, li } from 'hyperaxe';

const MENU_SECTION_LABELS = {
  selection: 'Selección',
  home: 'Explorador',
  corpus: 'Corpora',
  batch: 'Batches recientes'
};

/**
 * @typedef {object} ViewerLinkProps
 * @property {string} [href]
 * @property {string} label
 * @property {string} [title]
 * @property {boolean} [disabled]
 * @property {string} [className]
 */

/**
 * @param {ViewerLinkProps} props
 */
export function openViewerLink({ href, label, title, disabled = false, className = '' }) {
  const cls = ['viewer-launcher', 'viewer-launcher-link', className].filter(Boolean).join(' ');
  if (disabled || !href) {
    return span({
      class: `${cls} viewer-launcher--disabled`.trim(),
      title: title || label
    }, label);
  }
  return a({
    href,
    class: cls,
    target: '_blank',
    rel: 'noopener noreferrer',
    title: title || label
  }, label, ' ↗');
}

/**
 * @param {ViewerLinkProps & { variant?: string }} props
 */
export function openViewerButton({
  href,
  label,
  title,
  disabled = false,
  variant = 'outline',
  className = ''
}) {
  const cls = [
    'btn',
    `btn-${variant}`,
    'btn-sm',
    'viewer-launcher-btn',
    className
  ].filter(Boolean).join(' ');

  if (disabled || !href) {
    return button({
      type: 'button',
      class: `${cls} viewer-launcher--disabled`.trim(),
      disabled: 'disabled',
      title: title || label
    }, label);
  }

  return a({
    href,
    class: cls,
    target: '_blank',
    rel: 'noopener noreferrer',
    title: title || label
  }, label, ' ↗');
}

/**
 * Short visible meta; long titles stay in tooltip only.
 * @param {{ label?: string, title?: string, kind?: string }} item
 */
function menuItemMeta(item) {
  const title = item.title || '';
  if (item.kind === 'corpus' && /\d+\s*archivos?/i.test(title)) return title;
  if (title && title.length <= 14 && title !== item.label) return title;
  return '↗';
}

/**
 * @param {{ href?: string, label: string, title?: string, disabled?: boolean, kind?: string }} item
 */
function menuItemLink(item) {
  const meta = menuItemMeta(item);
  if (item.disabled || !item.href) {
    return div({ class: 'viewer-launcher-menu-link--disabled', title: item.title || item.label },
      span({ class: 'viewer-launcher-menu-link-label' }, item.label),
      item.kind
        ? span({ class: 'viewer-launcher-menu-link-kind', 'data-kind': item.kind }, item.kind)
        : span({ class: 'viewer-launcher-menu-link-meta' }, meta)
    );
  }

  return a({
    href: item.href,
    class: 'viewer-launcher-menu-link',
    target: '_blank',
    rel: 'noopener noreferrer',
    title: item.title || item.label,
    role: 'menuitem'
  },
    span({ class: 'viewer-launcher-menu-link-label' }, item.label),
    span({ class: 'viewer-launcher-menu-link-meta' }, meta)
  );
}

/**
 * @param {Array<{ href?: string, label: string, title?: string, disabled?: boolean, kind?: string }>} items
 */
function menuListItems(items) {
  const nodes = [];
  let lastKind = null;

  for (const item of items) {
    const kind = item.kind || null;
    if (kind && kind !== lastKind && MENU_SECTION_LABELS[kind]) {
      nodes.push(li({ class: 'viewer-launcher-menu-section' }, MENU_SECTION_LABELS[kind]));
      lastKind = kind;
    } else if (!kind && lastKind !== '__plain') {
      lastKind = '__plain';
    }

    nodes.push(li({ class: 'viewer-launcher-menu-item' }, menuItemLink(item)));
  }

  return nodes;
}

/**
 * @param {{ id?: string, label?: string, items?: Array<{ href?: string, label: string, title?: string, disabled?: boolean, kind?: string }> }} props
 */
export function viewerLauncherMenu({ id, label = 'Referencias', items = [] }) {
  const enabled = items.filter((item) => item.href && !item.disabled);
  if (enabled.length === 0) {
    return div({
      class: 'viewer-launcher-menu viewer-launcher-menu--empty',
      ...(id ? { id } : {})
    },
      span({ class: 'viewer-launcher-menu-label' }, label)
    );
  }

  return details({
    class: 'viewer-launcher-menu',
    ...(id ? { id } : {})
  },
    summary({ class: 'viewer-launcher-menu-trigger btn btn-outline btn-sm' },
      span({ class: 'viewer-launcher-menu-trigger-label' }, label),
      span({ class: 'viewer-launcher-menu-trigger-badge' }, String(enabled.length)),
      span({ class: 'viewer-launcher-menu-chevron', 'aria-hidden': 'true' })
    ),
    div({ class: 'viewer-launcher-menu-panel', role: 'menu' },
      ul({ class: 'viewer-launcher-menu-list' }, ...menuListItems(enabled))
    )
  );
}

/**
 * Empty mount slot for client-side ViewerLauncher.
 * @param {{ className?: string, deckId?: string }} [props]
 */
export function viewerLauncherSlot({ className = '', deckId } = {}) {
  const classes = ['viewer-launcher-slot', className].filter(Boolean).join(' ');
  return div({
    class: classes,
    ...(deckId ? { 'data-deck': deckId } : {})
  });
}
