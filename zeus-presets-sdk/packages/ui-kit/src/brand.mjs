/** Centralized Zeus shell branding — company, product, license, footer/tag helpers. */

export const ZEUS_COMPANY = 'Scriptorium';
export const ZEUS_PRODUCT = 'Zeus SDK';
export const ZEUS_LICENSE_LABEL = 'Animus Iocandi AIPLv1';

/** Header tag line: `Scriptorium · Zeus SDK` */
export function formatShellTag() {
  return `${ZEUS_COMPANY} · ${ZEUS_PRODUCT}`;
}

/**
 * Footer legal line.
 * @param {string} [uiTag] Optional UI-specific prefix (e.g. `Zeus View`).
 */
export function formatShellFooter(uiTag) {
  const core = `${ZEUS_COMPANY} · ${ZEUS_PRODUCT} · ${ZEUS_LICENSE_LABEL}`;
  return uiTag ? `${uiTag} · ${core}` : core;
}

/**
 * Default shell brand object for header + footer.
 * @param {string} [uiTitle] UI-specific title (Editor, Tablero ALEPH, etc.).
 */
export function defaultShellBrand(uiTitle) {
  return {
    title: uiTitle || ZEUS_PRODUCT,
    tag: formatShellTag(),
    footer: formatShellFooter()
  };
}
