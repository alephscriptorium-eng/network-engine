/**
 * MCP Editor View - Interactive MCP server exploration and preset management.
 * Ported from zeus/views/editor_view.js (CJS -> ESM). Fixes a missing
 * `textarea` import present in the original file.
 */

import {
  div, section, header, h1, h2, h3, h4, button, input, select, option, form,
  ul, li, p, span, nav, label, textarea
} from 'hyperaxe';
import { template, pageContainer } from './main_views.mjs';

// Import shared components
import {
  mcpServerBrowser
} from './shared_components.mjs';

/**
 * Main MCP editor view component
 */
export const editorView = (data = {}) => {
  const {
    servers = [],
    selectedServer = null,
    serverContent = {},
    selectedItems = [],
    isLoading = false,
    error = null
  } = data;

  return template(
    'MCP Editor',
    pageContainer(
      section({ class: 'mcp-editor-container' },
        editorHeader(),
        div({ class: 'mcp-editor-main' },
          mcpServerBrowser({ servers, selectedServer, isLoading, error }),
          contentExplorer({ selectedServer, serverContent, selectedItems }),
          presetCreator({ selectedItems, selectedServer })
        )
      )
    ),
    {
      currentPage: 'mcp',
      styles: ['/assets/styles/mcp-editor.css'],
      scripts: ['/assets/js/mcp-editor.js']
    }
  );
};

/**
 * MCP editor header with navigation and actions
 */
const editorHeader = () => {
  return header({ class: 'mcp-editor-header' },
    div({ class: 'header-content' },
      div({ class: 'header-title' },
        h1('MCP Editor'),
        p({ class: 'header-subtitle' },
          'Explore MCP servers and create presets from tools, resources, and prompts'
        )
      ),

      div({ class: 'header-actions' },
        button({
          class: 'btn btn-secondary',
          'data-action': 'refresh-servers'
        }, '🔄 Refresh'),

        button({
          class: 'btn btn-secondary',
          'data-action': 'manage-servers'
        }, '⚙️ Manage Servers'),

        button({
          class: 'btn btn-primary',
          'data-action': 'create-from-selection',
          id: 'create-preset-btn',
          disabled: true
        }, '📝 Create Preset')
      )
    )
  );
};

/**
 * Content explorer - main browsing area
 */
const contentExplorer = ({ selectedServer, serverContent, selectedItems }) => {
  if (!selectedServer) {
    return div({ class: 'content-explorer' },
      explorerWelcome()
    );
  }

  return div({ class: 'content-explorer' },
    explorerHeader(selectedServer, selectedItems),
    explorerTabs(serverContent),
    explorerContent(serverContent, selectedItems)
  );
};

/**
 * Welcome state for content explorer
 */
const explorerWelcome = () => {
  return div({ class: 'explorer-welcome' },
    div({ class: 'welcome-content' },
      h2('Select an MCP Server'),
      p('Choose a server from the sidebar to explore its tools, resources, and prompts.'),

      div({ class: 'welcome-features' },
        div({ class: 'feature-item' },
          span({ class: 'feature-icon' }, '🛠️'),
          div(
            h4('Tools'),
            p('Executable functions and operations')
          )
        ),

        div({ class: 'feature-item' },
          span({ class: 'feature-icon' }, '📦'),
          div(
            h4('Resources'),
            p('Data sources and file references')
          )
        ),

        div({ class: 'feature-item' },
          span({ class: 'feature-icon' }, '💭'),
          div(
            h4('Prompts'),
            p('Pre-configured prompt templates')
          )
        )
      )
    )
  );
};

/**
 * Explorer header with server info and selection controls
 */
const explorerHeader = (server, selectedItems) => {
  return div({ class: 'explorer-header' },
    div({ class: 'server-info' },
      h2(server.name),
      p(server.description),
      span({ class: `server-status ${server.status === 'connected' ? 'connected' : 'disconnected'}` },
        server.status === 'connected' ? '🟢 Connected' : '🔴 Disconnected'
      )
    ),

    div({ class: 'selection-info' },
      span({ class: 'selection-count' },
        `${selectedItems.length} items selected`
      ),

      selectedItems.length > 0 && div({ class: 'selection-actions' },
        button({
          class: 'btn btn-secondary btn-small',
          'data-action': 'clear-selection'
        }, 'Clear Selection'),

        button({
          class: 'btn btn-primary btn-small',
          'data-action': 'create-preset-from-selection'
        }, 'Create Preset')
      )
    )
  );
};

/**
 * Explorer content tabs
 */
const explorerTabs = (serverContent) => {
  const { tools = [], resources = [], prompts = [] } = serverContent;

  return nav({ class: 'explorer-tabs' },
    button({
      class: 'tab-button active',
      'data-tab': 'tools',
      'data-action': 'switch-tab'
    }, `Tools (${tools.length})`),

    button({
      class: 'tab-button',
      'data-tab': 'resources',
      'data-action': 'switch-tab'
    }, `Resources (${resources.length})`),

    button({
      class: 'tab-button',
      'data-tab': 'prompts',
      'data-action': 'switch-tab'
    }, `Prompts (${prompts.length})`)
  );
};

/**
 * Explorer content area with items
 */
const explorerContent = (serverContent, selectedItems) => {
  const { tools = [], resources = [], prompts = [] } = serverContent;

  return div({ class: 'explorer-content' },
    div({ class: 'content-controls' },
      div({ class: 'search-filter' },
        input({
          type: 'text',
          id: 'content-search',
          class: 'search-input',
          placeholder: 'Search items...'
        }),

        select({
          id: 'content-category-filter',
          class: 'category-filter'
        },
          option({ value: '' }, 'All Categories'),
          option({ value: 'file' }, 'File Operations'),
          option({ value: 'web' }, 'Web Operations'),
          option({ value: 'analysis' }, 'Analysis'),
          option({ value: 'development' }, 'Development')
        )
      ),

      div({ class: 'view-controls' },
        button({
          class: 'view-btn grid-view active',
          'data-view': 'grid',
          'data-action': 'change-content-view'
        }, '⊞'),

        button({
          class: 'view-btn list-view',
          'data-view': 'list',
          'data-action': 'change-content-view'
        }, '☰')
      )
    ),

    // Tab content panels
    div({
      class: 'tab-content active',
      'data-tab-content': 'tools'
    },
      tools.length > 0
        ? toolsGrid(tools, selectedItems)
        : emptyTabState('tools')
    ),

    div({
      class: 'tab-content',
      'data-tab-content': 'resources'
    },
      resources.length > 0
        ? resourcesGrid(resources, selectedItems)
        : emptyTabState('resources')
    ),

    div({
      class: 'tab-content',
      'data-tab-content': 'prompts'
    },
      prompts.length > 0
        ? promptsGrid(prompts, selectedItems)
        : emptyTabState('prompts')
    )
  );
};

/**
 * Tools grid component
 */
const toolsGrid = (tools, selectedItems) => {
  return div({ class: 'items-grid' },
    tools.map(tool => toolItem(tool, selectedItems.includes(tool.id)))
  );
};

/**
 * Individual tool item
 */
const toolItem = (tool, isSelected) => {
  return div({
    class: `item-card tool-item ${isSelected ? 'selected' : ''} clickable`,
    'data-item-id': tool.id || tool.name,
    'data-item-type': 'tool',
    'data-action': 'toggle-selection',
    style: 'cursor: pointer;'
  },
    div({ class: 'item-header' },
      div({ class: 'item-icon tool-icon' }, '🛠️'),
      h4({ class: 'item-name' }, tool.name),
      div({ class: 'item-actions' },
        button({
          class: 'btn-icon test-tool',
          'data-tool-name': tool.name,
          'data-action': 'test-tool',
          title: 'Test tool'
        }, '▶️'),

        isSelected && span({ class: 'selected-indicator' }, '✓')
      )
    ),

    tool.description && p({ class: 'item-description' }, tool.description),

    div({ class: 'item-meta' },
      tool.category && span({ class: 'item-category' }, tool.category),
      span({ class: 'item-type' }, 'Tool')
    )
  );
};

/**
 * Resources grid component
 */
const resourcesGrid = (resources, selectedItems) => {
  return div({ class: 'items-grid' },
    resources.map(resource => resourceItem(resource, selectedItems.includes(resource.id)))
  );
};

/**
 * Individual resource item
 */
const resourceItem = (resource, isSelected) => {
  return div({
    class: `item-card resource-item ${isSelected ? 'selected' : ''} clickable`,
    'data-item-id': resource.id || resource.name,
    'data-item-type': 'resource',
    'data-action': 'toggle-selection',
    style: 'cursor: pointer;'
  },
    div({ class: 'item-header' },
      div({ class: 'item-icon resource-icon' }, '📦'),
      h4({ class: 'item-name' }, resource.name),
      div({ class: 'item-actions' },
        button({
          class: 'btn-icon preview-resource',
          'data-resource-name': resource.name,
          'data-action': 'preview-resource',
          title: 'Preview resource'
        }, '👁️'),

        isSelected && span({ class: 'selected-indicator' }, '✓')
      )
    ),

    resource.description && p({ class: 'item-description' }, resource.description),

    div({ class: 'item-meta' },
      resource.type && span({ class: 'item-category' }, resource.type),
      span({ class: 'item-type' }, 'Resource')
    )
  );
};

/**
 * Prompts grid component
 */
const promptsGrid = (prompts, selectedItems) => {
  return div({ class: 'items-grid' },
    prompts.map(prompt => promptItem(prompt, selectedItems.includes(prompt.id)))
  );
};

/**
 * Individual prompt item
 */
const promptItem = (prompt, isSelected) => {
  return div({
    class: `item-card prompt-item ${isSelected ? 'selected' : ''} clickable`,
    'data-item-id': prompt.id || prompt.name,
    'data-item-type': 'prompt',
    'data-action': 'toggle-selection',
    style: 'cursor: pointer;'
  },
    div({ class: 'item-header' },
      div({ class: 'item-icon prompt-icon' }, '💭'),
      h4({ class: 'item-name' }, prompt.name),
      div({ class: 'item-actions' },
        button({
          class: 'btn-icon use-prompt',
          'data-prompt-name': prompt.name,
          'data-action': 'use-prompt',
          title: 'Use prompt'
        }, '🚀'),

        isSelected && span({ class: 'selected-indicator' }, '✓')
      )
    ),

    prompt.description && p({ class: 'item-description' }, prompt.description),

    div({ class: 'item-meta' },
      prompt.category && span({ class: 'item-category' }, prompt.category),
      span({ class: 'item-type' }, 'Prompt')
    )
  );
};

/**
 * Empty tab state
 */
const emptyTabState = (type) => {
  const config = {
    tools: {
      icon: '🛠️',
      title: 'No tools available',
      description: 'This server doesn\'t expose any tools.'
    },
    resources: {
      icon: '📦',
      title: 'No resources available',
      description: 'This server doesn\'t provide any resources.'
    },
    prompts: {
      icon: '💭',
      title: 'No prompts available',
      description: 'This server doesn\'t offer any prompt templates.'
    }
  };

  const { icon, title, description } = config[type] || config.tools;

  return div({ class: 'empty-tab-state' },
    div({ class: 'empty-icon' }, icon),
    h3(title),
    p(description)
  );
};

/**
 * Preset creator panel
 */
const presetCreator = ({ selectedItems, selectedServer }) => {
  return div({ class: 'preset-creator' },
    div({ class: 'creator-header' },
      h3('Preset Creator'),
      span({ class: 'selection-count' },
        `${selectedItems.length} items selected`
      )
    ),

    selectedItems.length > 0
      ? presetCreatorForm(selectedItems, selectedServer)
      : presetCreatorEmpty()
  );
};

/**
 * Empty preset creator state
 */
const presetCreatorEmpty = () => {
  return div({ class: 'creator-empty' },
    div({ class: 'empty-icon' }, '📝'),
    p('Select tools, resources, or prompts to create a preset'),

    div({ class: 'creator-tips' },
      h4('Tips:'),
      ul(
        li('Select multiple items to combine them'),
        li('Mix tools, resources, and prompts'),
        li('Create reusable workflows')
      )
    )
  );
};

/**
 * Preset creator form
 */
const presetCreatorForm = (selectedItems, selectedServer) => {
  return form({
    id: 'preset-creator-form',
    class: 'creator-form'
  },
    div({ class: 'selected-items-preview' },
      h4('Selected Items:'),
      ul({ class: 'selected-items-list' },
        selectedItems.slice(0, 5).map(itemId =>
          li({ class: 'selected-item' },
            span(itemId),
            button({
              class: 'btn-icon remove-item',
              'data-item-id': itemId,
              'data-action': 'remove-from-selection',
              title: 'Remove from selection'
            }, '✕')
          )
        ),

        selectedItems.length > 5 &&
        li({ class: 'items-overflow' },
          `+${selectedItems.length - 5} more items`
        )
      )
    ),

    div({ class: 'form-group' },
      label({ for: 'preset-name' }, 'Preset Name'),
      input({
        type: 'text',
        id: 'preset-name',
        name: 'name',
        placeholder: 'Enter preset name...',
        required: true
      })
    ),

    div({ class: 'form-group' },
      label({ for: 'preset-description' }, 'Description'),
      textarea({
        id: 'preset-description',
        name: 'description',
        rows: '3',
        placeholder: 'Describe what this preset does...'
      })
    ),

    div({ class: 'form-group' },
      label({ for: 'preset-category' }, 'Category'),
      select({
        id: 'preset-category',
        name: 'category'
      },
        option({ value: 'Development' }, 'Development'),
        option({ value: 'Analysis' }, 'Analysis'),
        option({ value: 'Creative' }, 'Creative'),
        option({ value: 'General' }, 'General')
      )
    ),

    // Prompt content (optional in this build)
    div({ class: 'form-group' },
      label({ for: 'preset-prompt' }, 'Prompt'),
      textarea({
        id: 'preset-prompt',
        name: 'prompt',
        rows: '6',
        placeholder: 'Enter the prompt template (optional)...'
      })
    ),

    div({ class: 'form-actions' },
      button({
        type: 'submit',
        class: 'btn btn-primary'
      }, 'Create Preset'),

      button({
        type: 'button',
        class: 'btn btn-secondary',
        'data-action': 'preview-preset'
      }, 'Preview'),

      button({
        type: 'button',
        class: 'btn btn-secondary',
        'data-action': 'clear-selection'
      }, 'Clear Selection')
    )
  );
};
