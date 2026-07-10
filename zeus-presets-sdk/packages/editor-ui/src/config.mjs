import { createAppConfig } from '@zeus/app-shell';

export const {
  packageDir,
  getAppConfig,
  getConfig,
  updateConfig,
  setTheme,
  updateSection,
  getSectionDefaults,
  resolveDataDir
} = createAppConfig({
  appId: 'editor',
  defaultPort: 3012,
  importMetaUrl: import.meta.url,
  features: { presetLibrary: true, mcpExplorer: true, themeSystem: true }
});
