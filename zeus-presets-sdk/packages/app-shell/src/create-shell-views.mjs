/**
 * Shared shell views factory (template + navigation) for Zeus UI packages.
 */

import {
  template as uiTemplate,
  navLink,
  pageContainer,
  contentSection,
  defaultShellBrand,
  formatShellTag,
  formatShellFooter
} from '@zeus/ui-kit';
import { resolveUiMesh } from '@zeus/presets-sdk';

/**
 * @param {object} options
 * @param {string} options.uiId
 * @param {() => object} options.getAppConfig
 * @param {(config?: object) => string} options.resolveDataDir
 * @param {(config: object) => { title: string, tag?: string, footer?: string }} [options.getBrand]
 * @param {() => Array<{ href: string, emoji: string, text: string, pageKey: string }>} [options.buildLocalNavEntries]
 * @param {string} [options.defaultCurrentPage='']
 * @param {string} [options.defaultTheme='Black-White-MCP']
 */
export function createShellViews(options) {
  const {
    uiId,
    getAppConfig,
    resolveDataDir,
    getBrand,
    buildLocalNavEntries = () => [],
    defaultCurrentPage = '',
    defaultTheme = 'Black-White-MCP'
  } = options;

  function shellOptions(viewOptions = {}) {
    const config = getAppConfig();
    const dataDir = resolveDataDir(config);
    const mesh = resolveUiMesh({ dataDir, localConfig: config, selfUiId: uiId });
    const brand = getBrand ? getBrand(config) : defaultShellBrand(uiId);

    return {
      uiId,
      meshEntries: mesh.entries,
      localNavEntries: buildLocalNavEntries(),
      theme: viewOptions.theme || config.theme?.current || defaultTheme,
      themes: viewOptions.themes || [],
      showThemeSelector: true,
      brand: {
        title: brand.title,
        tag: brand.tag || formatShellTag(),
        footer: brand.footer || formatShellFooter()
      },
      currentPage: viewOptions.currentPage || defaultCurrentPage
    };
  }

  const template = (pageTitle, content, viewOptions = {}) => {
    return uiTemplate(pageTitle, content, {
      ...shellOptions(viewOptions),
      ...viewOptions
    });
  };

  return { template, navLink, pageContainer, contentSection };
}
