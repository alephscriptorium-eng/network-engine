/**
 * Home view - landing page.
 * Ported from zeus/views/home_view.js (CJS -> ESM). AI Conversations and
 * Statistics cards/links removed (no inference in this build).
 */

import { div, h2, p, section, a, span } from 'hyperaxe';
import { template, pageContainer, contentSection } from './main_views.mjs';
import { getConfig } from '../config.mjs';

export const homeView = (options = {}) => {
  const config = getConfig();

  return template(
    'Home',
    pageContainer(
      // Hero section
      contentSection(
        'Zeus Presets Editor',
        section({ class: 'hero-section' },
          div({ class: 'hero-content' },
            h2({ class: 'hero-subtitle' }, 'Web Interface for Model Context Protocol'),
            p({ class: 'hero-description' },
              'Explore, manage, and interact with MCP servers through an intuitive web interface. ',
              'Browse server catalogs, create presets, and manage themes.'
            ),
            div({ class: 'hero-actions' },
              a({ href: '/presets', class: 'btn btn-primary' }, '📚 Browse Presets'),
              a({ href: '/editor', class: 'btn btn-secondary' }, '🔧 Open MCP Editor')
            )
          )
        ),
        { class: 'hero-container' }
      ),

      // Features section
      contentSection(
        'Key Features',
        div({ class: 'features-grid' },
          featureCard({
            emoji: '📚',
            title: 'Preset Library',
            description: 'Manage and organize presets for different use cases and workflows.',
            link: '/presets'
          }),
          featureCard({
            emoji: '🔧',
            title: 'MCP Editor',
            description: 'Explore MCP servers, browse available tools, resources, and prompts.',
            link: '/editor'
          }),
          featureCard({
            emoji: '🎨',
            title: 'Theme System',
            description: 'Customize the interface appearance with multiple built-in themes.',
            link: '/settings'
          }),
          featureCard({
            emoji: '⚙️',
            title: 'Configuration',
            description: 'Manage application settings, features, and system preferences.',
            link: '/settings'
          })
        )
      ),

      // Theme preview section
      contentSection(
        'Theme Preview',
        div({ class: 'theme-preview-section' },
          p({ class: 'text-muted mb-2' },
            `Current theme: ${config.theme.current || 'Black-White-MCP'}`
          ),
          themePreview(config.theme.current || 'Black-White-MCP')
        )
      ),

      // Status section
      contentSection(
        'System Status',
        div({ class: 'status-grid' },
          statusCard('Server', config.server ? '✅ Running' : '❌ Offline', 'success'),
          statusCard('Preset Library', config.features.presetLibrary ? '✅ Enabled' : '❌ Disabled'),
          statusCard('MCP Explorer', config.features.mcpExplorer ? '✅ Enabled' : '❌ Disabled'),
          statusCard('Theme System', config.features.themeSystem ? '✅ Enabled' : '❌ Disabled')
        )
      )
    ),
    { currentPage: 'home' }
  );
};

/**
 * Feature card component
 */
const featureCard = ({ emoji, title, description, link }) => {
  return div({ class: 'feature-card' },
    div({ class: 'feature-icon' }, emoji),
    h2({ class: 'feature-title' }, title),
    p({ class: 'feature-description' }, description),
    a({ href: link, class: 'feature-link' }, 'Learn more →')
  );
};

/**
 * Theme preview component
 */
const themePreview = (currentTheme) => {
  const themes = ['Black-White-MCP', 'Clear-MCP', 'Dark-MCP', 'Matrix-MCP', 'Purple-MCP', 'Orange-Dark-MCP'];

  return div({ class: 'theme-preview-grid' },
    themes.map(theme =>
      div({
        class: `theme-preview-item ${theme === currentTheme ? 'current' : ''}`
      },
        div({ class: `theme-sample theme-sample-${theme}` }),
        span({ class: 'theme-name' }, theme.replace('-MCP', '')),
        theme === currentTheme && span({ class: 'current-badge' }, 'Current')
      )
    )
  );
};

/**
 * Status card component
 */
const statusCard = (label, status, type = 'info') => {
  return div({ class: `status-card status-${type}` },
    div({ class: 'status-label' }, label),
    div({ class: 'status-value' }, status)
  );
};
