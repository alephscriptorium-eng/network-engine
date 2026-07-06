/**
 * Settings View - Zeus Presets Editor
 * Ported from zeus/views/settings_view.js (CJS -> ESM). The AI configuration
 * section and the aiConversations feature toggle were removed (no inference
 * in this build).
 */

import {
  div, h2, h3, form, select, option, input, button, label,
  fieldset, legend, p, span, strong
} from 'hyperaxe';
import { template, pageContainer, contentSection } from './main_views.mjs';
import { getSectionDefaults } from '../config.mjs';

export const settingsView = (settings = {}) => {
  const {
    theme = getSectionDefaults('theme'),
    ui = getSectionDefaults('ui'),
    features = getSectionDefaults('features'),
    mcp = getSectionDefaults('mcp'),
    presets = getSectionDefaults('presets')
  } = settings;

  return template(
    'Settings',
    pageContainer(
      div({ class: 'settings-page' },

        // Page Header
        contentSection(
          'Settings',
          div({ class: 'settings-header' },
            p({ class: 'settings-description' },
              'Configure your MCP interface preferences, themes, and features.'
            )
          )
        ),

        // Settings Form
        form({
          class: 'settings-form',
          id: 'zeus-settings-form',
          'data-api-base': '/api/settings'
        },

          // Appearance Section
          settingsSection(
            'Appearance',
            'Theme and visual preferences',
            div({ class: 'settings-group' },
              themeSelector(theme.current),
              animationsToggle(ui.animations),
              darkModeToggle(ui.darkMode)
            )
          ),

          // Interface Section
          settingsSection(
            'Interface',
            'Language and interaction preferences',
            div({ class: 'settings-group' },
              languageSelector(ui.language),
              uiPreferences(ui)
            )
          ),

          // Features Section
          settingsSection(
            'Features',
            'Enable or disable application modules',
            div({ class: 'settings-group' },
              featureToggles(features)
            )
          ),

          // Advanced Configuration
          settingsSection(
            'Advanced',
            'MCP server and preset configuration',
            div({ class: 'settings-group' },
              mcpConfiguration(mcp),
              presetConfiguration(presets)
            )
          ),

          // Action Buttons
          div({ class: 'settings-actions' },
            button({
              type: 'button',
              class: 'btn btn-secondary',
              id: 'reset-settings'
            }, 'Reset to Defaults'),

            button({
              type: 'button',
              class: 'btn btn-primary',
              id: 'save-settings'
            }, 'Save Changes')
          )
        ),

        // Status Messages
        div({ id: 'settings-messages', class: 'settings-messages' })
      )
    ),
    {
      currentPage: 'settings',
      styles: ['/assets/styles/settings.css'],
      scripts: ['/assets/js/settings.js']
    }
  );
};

/**
 * Settings section wrapper component
 */
export const settingsSection = (title, description, content) => {
  return fieldset({ class: 'settings-section' },
    legend({ class: 'settings-legend' },
      h2({ class: 'settings-section-title' }, title),
      description && p({ class: 'settings-section-description' }, description)
    ),
    content
  );
};

/**
 * Theme Selector Component
 */
export const themeSelector = (currentTheme) => {
  const availableThemes = [
    { value: 'Black-White-MCP', label: 'Black & White MCP', description: 'Monochrome interface with Courier New typography' },
    { value: 'Clear-MCP', label: 'Clear MCP', description: 'Light, clean interface' },
    { value: 'Dark-MCP', label: 'Dark MCP', description: 'Dark theme with blue accents' },
    { value: 'Purple-MCP', label: 'Purple MCP', description: 'Purple gradient theme' },
    { value: 'Matrix-MCP', label: 'Matrix MCP', description: 'Green matrix-style theme' },
    { value: 'Orange-Dark-MCP', label: 'Orange Dark MCP', description: 'Dark theme with orange accents' }
  ];

  return div({ class: 'setting-item theme-selector' },
    label({ for: 'theme-select', class: 'setting-label' },
      strong('Theme'),
      span({ class: 'setting-description' }, 'Choose your interface color scheme')
    ),

    div({ class: 'theme-selector-wrapper' },
      select({
        id: 'theme-select',
        name: 'theme',
        class: 'form-select theme-select',
        'data-section': 'theme',
        'data-field': 'current'
      },
        ...availableThemes.map(theme =>
          option({
            value: theme.value,
            selected: currentTheme === theme.value ? 'selected' : null
          }, theme.label)
        )
      ),

      // Theme Preview Area
      div({ class: 'theme-preview', id: 'theme-preview' },
        div({ class: 'theme-preview-header' },
          span({ class: 'theme-preview-title' }, 'Preview'),
          div({ class: 'theme-preview-colors' },
            span({ class: 'color-primary' }),
            span({ class: 'color-secondary' }),
            span({ class: 'color-accent' })
          )
        )
      )
    )
  );
};

/**
 * Language Selector Component
 */
export const languageSelector = (currentLanguage) => {
  const availableLanguages = [
    { value: 'en', label: 'English', nativeName: 'English' },
    { value: 'es', label: 'Spanish', nativeName: 'Español' }
  ];

  return div({ class: 'setting-item language-selector' },
    label({ for: 'language-select', class: 'setting-label' },
      strong('Language'),
      span({ class: 'setting-description' }, 'Interface language preference')
    ),

    select({
      id: 'language-select',
      name: 'language',
      class: 'form-select',
      'data-section': 'ui',
      'data-field': 'language'
    },
      ...availableLanguages.map(lang =>
        option({
          value: lang.value,
          selected: currentLanguage === lang.value ? 'selected' : null
        }, `${lang.label} (${lang.nativeName})`)
      )
    )
  );
};

/**
 * Animations Toggle Component
 */
const animationsToggle = (enabled) => {
  return div({ class: 'setting-item toggle-setting' },
    label({ class: 'setting-label toggle-label' },
      input({
        type: 'checkbox',
        id: 'animations-toggle',
        name: 'animations',
        class: 'setting-toggle',
        'data-section': 'ui',
        'data-field': 'animations',
        checked: enabled ? 'checked' : null
      }),
      span({ class: 'toggle-switch' }),
      div({ class: 'toggle-text' },
        strong('Enable Animations'),
        span({ class: 'setting-description' }, 'Smooth transitions and visual effects')
      )
    )
  );
};

/**
 * Dark Mode Toggle Component
 */
const darkModeToggle = (enabled) => {
  return div({ class: 'setting-item toggle-setting' },
    label({ class: 'setting-label toggle-label' },
      input({
        type: 'checkbox',
        id: 'darkmode-toggle',
        name: 'darkMode',
        class: 'setting-toggle',
        'data-section': 'ui',
        'data-field': 'darkMode',
        checked: enabled ? 'checked' : null
      }),
      span({ class: 'toggle-switch' }),
      div({ class: 'toggle-text' },
        strong('Dark Mode Preference'),
        span({ class: 'setting-description' }, 'Override theme dark/light mode')
      )
    )
  );
};

/**
 * UI Preferences Component
 */
const uiPreferences = (ui) => {
  return div({ class: 'ui-preferences' },
    div({ class: 'setting-note' },
      span({ class: 'note-icon' }, 'ℹ️'),
      'UI preferences are saved automatically and apply immediately.'
    )
  );
};

/**
 * Feature Toggles Component
 */
export const featureToggles = (features) => {
  const featureList = [
    { key: 'presetLibrary', label: 'Preset Library', description: 'Browse and manage presets' },
    { key: 'mcpExplorer', label: 'MCP Explorer', description: 'Browse and configure MCP servers' },
    { key: 'themeSystem', label: 'Theme System', description: 'Advanced theme customization' }
  ];

  return div({ class: 'feature-toggles' },
    ...featureList.map(feature =>
      div({ class: 'setting-item toggle-setting feature-toggle' },
        label({ class: 'setting-label toggle-label' },
          input({
            type: 'checkbox',
            id: `feature-${feature.key}`,
            name: feature.key,
            class: 'setting-toggle',
            'data-section': 'features',
            'data-field': feature.key,
            checked: features[feature.key] ? 'checked' : null
          }),
          span({ class: 'toggle-switch' }),
          div({ class: 'toggle-text' },
            strong(feature.label),
            span({ class: 'setting-description' }, feature.description)
          )
        )
      )
    )
  );
};

/**
 * MCP Configuration Component
 */
const mcpConfiguration = (mcp) => {
  return div({ class: 'mcp-configuration' },
    h3({ class: 'subsection-title' }, 'MCP Server Configuration'),

    div({ class: 'setting-item' },
      label({ for: 'mcp-timeout', class: 'setting-label' },
        strong('Connection Timeout'),
        span({ class: 'setting-description' }, 'Timeout in milliseconds for MCP connections')
      ),
      input({
        type: 'number',
        id: 'mcp-timeout',
        name: 'timeout',
        class: 'form-input',
        'data-section': 'mcp',
        'data-field': 'timeout',
        value: mcp.timeout,
        min: '1000',
        max: '60000',
        step: '1000'
      })
    ),

    div({ class: 'setting-note' },
      span({ class: 'note-icon' }, '🔧'),
      'MCP server discovery is configured in config.json (discovery.urls).'
    )
  );
};

/**
 * Preset Configuration Component
 */
const presetConfiguration = (presets) => {
  return div({ class: 'preset-configuration' },
    h3({ class: 'subsection-title' }, 'Preset Library Configuration'),

    div({ class: 'setting-item' },
      label({ for: 'preset-library', class: 'setting-label' },
        strong('Default Library'),
        span({ class: 'setting-description' }, 'Default preset collection to load')
      ),
      select({
        id: 'preset-library',
        name: 'library',
        class: 'form-select',
        'data-section': 'presets',
        'data-field': 'library'
      },
        option({ value: 'default', selected: presets.library === 'default' ? 'selected' : null }, 'Default Collection'),
        option({ value: 'custom', selected: presets.library === 'custom' ? 'selected' : null }, 'Custom Collection'),
        option({ value: 'imported', selected: presets.library === 'imported' ? 'selected' : null }, 'Imported Presets')
      )
    ),

    div({ class: 'setting-item toggle-setting' },
      label({ class: 'setting-label toggle-label' },
        input({
          type: 'checkbox',
          id: 'preset-autoload',
          name: 'autoLoad',
          class: 'setting-toggle',
          'data-section': 'presets',
          'data-field': 'autoLoad',
          checked: presets.autoLoad ? 'checked' : null
        }),
        span({ class: 'toggle-switch' }),
        div({ class: 'toggle-text' },
          strong('Auto-load Presets'),
          span({ class: 'setting-description' }, 'Automatically load preset library on startup')
        )
      )
    )
  );
};
