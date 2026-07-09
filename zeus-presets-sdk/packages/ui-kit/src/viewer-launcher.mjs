/**
 * Reusable SSR controls for opening @zeus/view-ui deep links.
 */

import { a, button, details, summary, div, span, ul, li } from 'hyperaxe';

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
 * @param {{ id?: string, label?: string, items?: Array<{ href?: string, label: string, title?: string, disabled?: boolean }> }} props
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
      label,
      ` (${enabled.length})`
    ),
    ul({ class: 'viewer-launcher-menu-list' },
      enabled.map((item) =>
        li({ class: 'viewer-launcher-menu-item' },
          openViewerLink({
            href: item.href,
            label: item.label,
            title: item.title
          })
        )
      )
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
