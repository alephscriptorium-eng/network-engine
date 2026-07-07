/**
 * MCP Editor Client-Side Functionality
 * Handles interactive MCP server exploration and preset creation
 */

class MCPEditor {
  constructor() {
    this.servers = [];
    this.selectedServer = null;
    this.selectedItems = new Set();
    this.currentTab = 'tools';
    this.currentView = 'grid';
    this.searchTerm = '';
    this.categoryFilter = '';
    this.serverContent = {};
    this.isLoading = false;
    this.editingPresetId = null; // ID del preset siendo editado
    this.isEditMode = false; // Flag para modo edición
    // Form metadata survives re-renders of the creator panel (edit mode fix)
    this.presetFormValues = { name: '', description: '', prompt: '', category: 'General' };
    
    this.init();
  }

  /**
   * Initialize the MCP Editor
   */
  init() {
    this.hydrateInitialState();
    this.bindEvents();
    this.loadServers();
    this.setupRealTimeUpdates();
    this.handleURLParameters();
  }

  /**
   * Hydrate initial state from server-rendered markup and URL params
   */
  hydrateInitialState() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlServerId = urlParams.get('server');
    const selectedServerElement = document.querySelector('.server-item.selected');
    const selectedServerId = urlServerId || selectedServerElement?.dataset?.serverId;

    if (!selectedServerId) return;

    const sidebarName = selectedServerElement?.querySelector('.server-name')?.textContent?.trim();
    const sidebarDescription = selectedServerElement?.querySelector('.server-description')?.textContent?.trim();
    const explorerName = document.querySelector('.explorer-header .server-info h2')?.textContent?.trim();
    const explorerDescription = document.querySelector('.explorer-header .server-info p')?.textContent?.trim();

    this.selectedServer = {
      id: selectedServerId,
      name: explorerName || sidebarName || selectedServerId,
      description: explorerDescription || sidebarDescription || `MCP Server: ${selectedServerId}`,
      status: 'connected',
      type: 'mcp'
    };
  }

  /**
   * Bind event handlers
   */
  bindEvents() {
    // Server selection and management
    document.addEventListener('click', this.handleClick.bind(this));
    
    // Form submission delegation (for dynamically created forms)
    document.addEventListener('submit', this.handleFormSubmit.bind(this));
    
    // Search and filtering
    this.bindDynamicControls();
    
    // Keyboard shortcuts
    document.addEventListener('keydown', this.handleKeyboard.bind(this));
  }

  /**
   * Bind controls that can be recreated after re-rendering the explorer
   */
  bindDynamicControls() {
    const searchInput = document.getElementById('content-search');
    if (searchInput) {
      searchInput.value = this.searchTerm;
      searchInput.oninput = this.handleSearch.bind(this);
    }

    const categoryFilter = document.getElementById('content-category-filter');
    if (categoryFilter) {
      categoryFilter.value = this.categoryFilter;
      categoryFilter.onchange = this.handleCategoryFilter.bind(this);
    }
  }

  /**
   * Handle all click events with delegation
   */
  handleClick(event) {
    // Look for action on clicked element or its parents
    let element = event.target;
    let action = null;
    
    while (element && !action) {
      action = element.dataset ? element.dataset.action : null;
      if (action) break;
      element = element.parentElement;
    }
    
    if (!action) return;

    event.preventDefault();
    event.stopPropagation();

    switch (action) {
      case 'select-server':
        this.selectServer(event.target.closest('[data-server-id]').dataset.serverId);
        break;
      case 'connect-server':
        this.connectServer(event.target.dataset.serverId);
        break;
      case 'disconnect-server':
        this.disconnectServer(event.target.dataset.serverId);
        break;
      case 'server-settings':
        this.openServerSettings(event.target.dataset.serverId);
        break;
      case 'add-server':
        this.openAddServerDialog();
        break;
      case 'refresh-servers':
        this.loadServers();
        break;
      case 'manage-servers':
        this.openServerManager();
        break;
      case 'switch-tab':
        this.switchTab(event.target.dataset.tab);
        break;
      case 'change-content-view':
        this.changeContentView(event.target.dataset.view);
        break;
      case 'toggle-selection':
        this.toggleItemSelection(element.closest('[data-item-id]'));
        break;
      case 'clear-selection':
        this.clearSelection();
        break;
      case 'test-tool':
        this.testTool(event.target.dataset.toolName);
        break;
      case 'preview-resource':
        this.previewResource(event.target.dataset.resourceName);
        break;
      case 'use-prompt':
        this.usePrompt(event.target.dataset.promptName);
        break;
      case 'create-preset-from-selection':
      case 'create-from-selection':
        this.createPresetFromSelection();
        break;
      case 'preview-preset':
        this.previewPreset();
        break;
      case 'remove-from-selection':
        this.removeFromSelection(event.target.dataset.itemId);
        break;
      case 'retry-servers':
        this.loadServers();
        break;
    }
  }

  /**
   * Handle form submission delegation
   */
  handleFormSubmit(event) {
    if (event.target.id === 'preset-creator-form') {
      this.handlePresetCreation(event);
    }
  }

  /**
   * Handle search input
   */
  handleSearch(event) {
    this.searchTerm = event.target.value.toLowerCase();
    this.filterContent();
  }

  /**
   * Handle category filter change
   */
  handleCategoryFilter(event) {
    this.categoryFilter = event.target.value;
    this.filterContent();
  }

  /**
   * Handle keyboard shortcuts
   */
  handleKeyboard(event) {
    // Ctrl+A to select all visible items
    if (event.ctrlKey && event.key === 'a' && this.selectedServer) {
      event.preventDefault();
      this.selectAllVisible();
    }
    
    // Escape to clear selection
    if (event.key === 'Escape') {
      this.clearSelection();
    }
    
    // Tab navigation (1, 2, 3, 4 for tools, resources, templates, prompts)
    if (event.key >= '1' && event.key <= '4' && !event.ctrlKey && !event.altKey) {
      const tabs = ['tools', 'resources', 'resourceTemplates', 'prompts'];
      const tabIndex = parseInt(event.key) - 1;
      if (tabs[tabIndex] && this.selectedServer) {
        event.preventDefault();
        this.switchTab(tabs[tabIndex]);
      }
    }
  }

  /**
   * Load MCP servers from API
   */
  async loadServers() {
    this.setLoadingState(true);
    
    try {
      const response = await fetch('/api/mcp/servers');
      const data = await response.json();
      
      if (data.success) {
        this.servers = data.servers || [];

        if (this.selectedServer?.id) {
          const selectedServer = this.servers.find(server => server.id === this.selectedServer.id);
          if (selectedServer) {
            this.selectedServer = selectedServer;
          }
        }

        this.renderServers(this.servers);
        this.setError(null);
      } else {
        throw new Error(data.error || 'Failed to load servers');
      }
    } catch (error) {
      console.error('Error loading servers:', error);
      this.setError(error.message);
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Select and load content for a server
   */
  async selectServer(serverId) {
    if (this.selectedServer?.id === serverId) return;
    
    this.setLoadingState(true);
    this.clearSelection();
    
    try {
      const response = await fetch(`/api/mcp/servers/${serverId}/content`);
      const data = await response.json();
      
      if (data.success) {
        const serverDetails = this.servers.find(server => server.id === serverId);

        this.selectedServer = {
          ...(serverDetails || {}),
          ...(data.server || {}),
          id: serverId,
          name: serverDetails?.name || data.server?.name || serverId,
          description: serverDetails?.description || data.server?.description || `MCP Server: ${serverId}`
        };
        this.serverContent = data.content || { tools: [], resources: [], resourceTemplates: [], prompts: [] };
        this.renderServerContent();
        this.updateServerSelection(serverId);
        this.updateURLForSelectedServer(serverId);
        this.setError(null);
      } else {
        throw new Error(data.error || 'Failed to load server content');
      }
    } catch (error) {
      console.error('Error loading server content:', error);
      this.setError(error.message);
    } finally {
      this.setLoadingState(false);
    }
  }

  /**
   * Connect to an MCP server
   */
  async connectServer(serverId) {
    try {
      const response = await fetch(`/api/mcp/servers/${serverId}/connect`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        this.showNotification('Server connected successfully', 'success');
        this.loadServers(); // Refresh server list
      } else {
        throw new Error(data.error || 'Failed to connect to server');
      }
    } catch (error) {
      console.error('Error connecting server:', error);
      this.showNotification(error.message, 'error');
    }
  }

  /**
   * Disconnect from an MCP server
   */
  async disconnectServer(serverId) {
    try {
      const response = await fetch(`/api/mcp/servers/${serverId}/disconnect`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        this.showNotification('Server disconnected', 'info');
        this.loadServers(); // Refresh server list
        
        // Clear content if this was the selected server
        if (this.selectedServer?.id === serverId) {
          this.selectedServer = null;
          this.serverContent = {};
          this.clearSelection();
          this.renderWelcome();
        }
      } else {
        throw new Error(data.error || 'Failed to disconnect from server');
      }
    } catch (error) {
      console.error('Error disconnecting server:', error);
      this.showNotification(error.message, 'error');
    }
  }

  /**
   * Switch between tabs (tools, resources, prompts)
   */
  switchTab(tab) {
    this.currentTab = tab;
    
    // Update tab buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tab}"]`)?.classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.querySelector(`[data-tab-content="${tab}"]`)?.classList.add('active');
    
    this.filterContent();
  }

  /**
   * Change content view (grid/list)
   */
  changeContentView(view) {
    this.currentView = view;
    
    // Update view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    document.querySelector(`[data-view="${view}"]`)?.classList.add('active');
    
    // Update grid classes
    const grids = document.querySelectorAll('.items-grid');
    grids.forEach(grid => {
      grid.classList.toggle('list-view', view === 'list');
    });
  }

  /**
   * Toggle selection of an item
   */
  toggleItemSelection(itemElement) {
    if (!itemElement) return;
    
    const itemId = itemElement.dataset.itemId;
    const itemType = itemElement.dataset.itemType;
    
    if (this.selectedItems.has(itemId)) {
      this.selectedItems.delete(itemId);
      itemElement.classList.remove('selected');
    } else {
      this.selectedItems.add(itemId);
      itemElement.classList.add('selected');
    }
    
    this.updateSelectionUI();
  }

  /**
   * Clear all selections
   */
  clearSelection() {
    this.selectedItems.clear();
    
    document.querySelectorAll('.item-card.selected').forEach(item => {
      item.classList.remove('selected');
    });
    
    this.updateSelectionUI();
  }

  /**
   * Select all visible items
   */
  selectAllVisible() {
    const activeTab = document.querySelector('.tab-content.active');
    if (!activeTab) return;
    
    const visibleItems = activeTab.querySelectorAll('.item-card:not([style*="display: none"])');
    
    visibleItems.forEach(item => {
      const itemId = item.dataset.itemId;
      this.selectedItems.add(itemId);
      item.classList.add('selected');
    });
    
    this.updateSelectionUI();
  }

  /**
   * Remove item from selection
   */
  removeFromSelection(itemId) {
    this.selectedItems.delete(itemId);
    
    const itemElement = document.querySelector(`[data-item-id="${itemId}"]`);
    if (itemElement) {
      itemElement.classList.remove('selected');
    }
    
    this.updateSelectionUI();
  }

  /**
   * Filter content based on search and category
   */
  filterContent() {
    const activeTab = document.querySelector('.tab-content.active');
    if (!activeTab) return;
    
    const items = activeTab.querySelectorAll('.item-card');
    
    items.forEach(item => {
      const itemName = item.querySelector('.item-name')?.textContent?.toLowerCase() || '';
      const itemDescription = item.querySelector('.item-description')?.textContent?.toLowerCase() || '';
      const itemUriTemplate = item.querySelector('.item-uri-template')?.textContent?.toLowerCase() || '';
      const itemCategory = item.querySelector('.item-category')?.textContent?.toLowerCase() || '';
      
      const matchesSearch = !this.searchTerm || 
        itemName.includes(this.searchTerm) || 
        itemDescription.includes(this.searchTerm) ||
        itemUriTemplate.includes(this.searchTerm);
        
      const matchesCategory = !this.categoryFilter || 
        itemCategory.includes(this.categoryFilter.toLowerCase());
      
      const shouldShow = matchesSearch && matchesCategory;
      item.style.display = shouldShow ? '' : 'none';
    });
  }

  /**
   * Test a tool
   */
  async testTool(toolName) {
    if (!this.selectedServer) return;
    
    try {
      this.showNotification(`Testing tool: ${toolName}...`, 'info');
      
      const response = await fetch(`/api/mcp/servers/${this.selectedServer.id}/tools/${toolName}/test`, {
        method: 'POST'
      });
      const data = await response.json();
      
      if (data.success) {
        this.showNotification(`Tool test completed successfully`, 'success');
        console.log('Tool test result:', data.result);
      } else {
        throw new Error(data.error || 'Tool test failed');
      }
    } catch (error) {
      console.error('Error testing tool:', error);
      this.showNotification(`Tool test failed: ${error.message}`, 'error');
    }
  }

  /**
   * Preview a resource
   */
  async previewResource(resourceName) {
    if (!this.selectedServer) return;
    
    try {
      const response = await fetch(`/api/mcp/servers/${this.selectedServer.id}/resources/${resourceName}`);
      const data = await response.json();
      
      if (data.success) {
        this.showResourcePreview(data.resource);
      } else {
        throw new Error(data.error || 'Failed to preview resource');
      }
    } catch (error) {
      console.error('Error previewing resource:', error);
      this.showNotification(`Failed to preview resource: ${error.message}`, 'error');
    }
  }

  /**
   * Use a prompt
   */
  usePrompt(promptName) {
    if (!this.selectedServer) return;
    
    // No AI chat in this build: add the prompt to the current selection
    this.selectedItems.add(promptName);
    const itemElement = document.querySelector(`[data-item-id="${promptName}"]`);
    if (itemElement) {
      itemElement.classList.add('selected');
    }
    this.updateSelectionUI();
    this.showNotification(`Prompt "${promptName}" added to selection`, 'info');
  }

  /**
   * Create preset from selection
   */
  createPresetFromSelection() {
    if (this.selectedItems.size === 0) {
      this.showNotification('Please select items to create a preset', 'warning');
      return;
    }
    
    // Scroll to preset creator and focus name input
    const creator = document.querySelector('.preset-creator');
    const nameInput = document.getElementById('preset-name');
    
    if (creator) {
      creator.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    if (nameInput) {
      setTimeout(() => nameInput.focus(), 500);
    }
  }

  /**
   * Handle preset creation/update form submission
   */
  async handlePresetCreation(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    
    // Ensure we have a valid serverId - fallback to first available server
    let serverId = this.selectedServer?.id;
    if (!serverId) {
      // Try to get the first connected server as fallback
      try {
        const response = await fetch('/api/mcp/servers');
        const data = await response.json();
        if (data.success && data.servers && data.servers.length > 0) {
          const firstConnectedServer = data.servers.find(server => server.status === 'connected');
          if (firstConnectedServer) {
            serverId = firstConnectedServer.id;
            console.log('Using fallback serverId:', serverId);
          }
        }
      } catch (error) {
        console.warn('Failed to get fallback server:', error);
      }
    }
    
    const presetData = {
      name: formData.get('name'),
      description: formData.get('description'),
      category: formData.get('category'),
      prompt: formData.get('prompt') || '',
      serverId: serverId,
      items: Array.from(this.selectedItems), // This is already a simple array of tool names 
      serverContent: this.serverContent
    };
    
    try {
      let response;
      let successMessage;
      
      if (this.isEditMode && this.editingPresetId) {
        // UPDATE existing preset
        response = await fetch(`/api/presets/${this.editingPresetId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(presetData)
        });
        successMessage = 'Preset updated successfully!';
      } else {
        // CREATE new preset
        response = await fetch('/api/presets', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(presetData)
        });
        successMessage = 'Preset created successfully!';
      }
      
      const data = await response.json();
      
      if (data.success) {
        this.showNotification(successMessage, 'success');
        this.resetFormValues();
        this.clearSelection();
        
        // Reset edit mode
        this.isEditMode = false;
        this.editingPresetId = null;
        
        // Optionally redirect to presets view
        setTimeout(() => {
          window.location.href = '/presets';
        }, 1500);
      } else {
        throw new Error(data.error || `Failed to ${this.isEditMode ? 'update' : 'create'} preset`);
      }
    } catch (error) {
      console.error(`Error ${this.isEditMode ? 'updating' : 'creating'} preset:`, error);
      this.showNotification(`Failed to ${this.isEditMode ? 'update' : 'create'} preset: ${error.message}`, 'error');
    }
  }

  /**
   * Preview preset before creation
   */
  previewPreset() {
    const formData = new FormData(document.getElementById('preset-creator-form'));
    const presetData = {
      name: formData.get('name') || 'Untitled Preset',
      description: formData.get('description') || 'No description',
      category: formData.get('category'),
      items: Array.from(this.selectedItems),
      serverName: this.selectedServer?.name
    };
    
    this.showPresetPreview(presetData);
  }

  /**
   * Setup real-time updates via WebSocket
   */
  setupRealTimeUpdates() {
    if (typeof io === 'undefined') return;
    
    const socket = io();
    
    socket.on('mcp-server-status-changed', (data) => {
      this.handleServerStatusChange(data);
    });
    
    socket.on('mcp-server-content-updated', (data) => {
      if (this.selectedServer?.id === data.serverId) {
        this.loadServerContent(data.serverId);
      }
    });
  }

  /**
   * Handle server status changes
   */
  handleServerStatusChange(data) {
    const serverElement = document.querySelector(`[data-server-id="${data.serverId}"]`);
    if (serverElement) {
      const statusElement = serverElement.querySelector('.server-status');
      if (statusElement) {
        statusElement.textContent = data.status === 'connected' ? '🟢' : '🔴';
      }
      
      serverElement.classList.remove('connected', 'disconnected');
      serverElement.classList.add(data.status);
    }
    
    this.showNotification(`Server ${data.serverName} ${data.status}`, 'info');
  }

  /**
   * Update selection UI elements
   */
  updateSelectionUI() {
    const count = this.selectedItems.size;
    
    // Update selection counts
    document.querySelectorAll('.selection-count').forEach(el => {
      el.textContent = `${count} items selected`;
    });
    
    // Update create preset button state
    const createBtn = document.getElementById('create-preset-btn');
    if (createBtn) {
      createBtn.disabled = count === 0;
    }
    
    // Update preset creator panel
    const creator = document.querySelector('.preset-creator');
    if (creator) {
      creator.classList.toggle('has-selection', count > 0);
      this.updatePresetCreatorContent();
    }
    
    // Show/hide selection actions
    document.querySelectorAll('.selection-actions').forEach(el => {
      el.style.display = count > 0 ? 'flex' : 'none';
    });
  }

  /**
   * Update preset creator content dynamically
   */
  updatePresetCreatorContent() {
    const creator = document.querySelector('.preset-creator');
    if (!creator) return;

    const count = this.selectedItems.size;
    const selectedItemsArray = Array.from(this.selectedItems);

    // Capture current form values BEFORE re-rendering, so user input
    // (or preloaded edit-mode metadata) survives selection changes
    this.captureFormValues();

    // Find the content area (everything after the header)
    const header = creator.querySelector('.creator-header');
    const existingContent = creator.querySelector('.creator-empty, .creator-form');
    
    if (existingContent) {
      existingContent.remove();
    }

    let contentHTML;
    
    if (count > 0) {
      // Create form HTML
      contentHTML = `
        <form id="preset-creator-form" class="creator-form">
          <div class="selected-items-preview">
            <h4>Selected Items:</h4>
            <ul class="selected-items-list">
              ${selectedItemsArray.slice(0, 5).map(itemId => `
                <li class="selected-item">
                  <span>${itemId}</span>
                  <button class="btn-icon remove-item" 
                          data-item-id="${itemId}" 
                          data-action="remove-from-selection" 
                          title="Remove from selection">✕</button>
                </li>
              `).join('')}
              ${selectedItemsArray.length > 5 ? `
                <li class="items-overflow">+${selectedItemsArray.length - 5} more items</li>
              ` : ''}
            </ul>
          </div>
          
          <div class="form-group">
            <label for="preset-name">Preset Name *</label>
            <input type="text" id="preset-name" name="name" required 
                   placeholder="Enter preset name">
          </div>
          
          <div class="form-group">
            <label for="preset-description">Description</label>
            <textarea id="preset-description" name="description" 
                      placeholder="Describe your preset (optional)"></textarea>
          </div>
          
          <div class="form-group">
            <label for="preset-prompt">Prompt Template *</label>
            <textarea id="preset-prompt" name="prompt" required
                      placeholder="Enter the AI prompt template for this preset..."></textarea>
          </div>
          
          <div class="form-group">
            <label for="preset-category">Category</label>
            <select id="preset-category" name="category">
              <option value="productivity">Productivity</option>
              <option value="development">Development</option>
              <option value="analysis">Analysis</option>
              <option value="automation">Automation</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-secondary" data-action="clear-selection">
              Clear Selection
            </button>
            <button type="submit" class="btn-primary">
              ${this.isEditMode ? 'Update Preset' : 'Create Preset'}
            </button>
          </div>
        </form>
      `;
    } else {
      // Create empty state HTML
      contentHTML = `
        <div class="creator-empty">
          <div class="empty-icon">📝</div>
          <p>Select tools, resources, or prompts to create a preset</p>
          
          <div class="creator-tips">
            <h4>Tips:</h4>
            <ul>
              <li>Select multiple items to combine them</li>
              <li>Mix tools, resources, and prompts</li>
              <li>Create reusable workflows</li>
            </ul>
          </div>
        </div>
      `;
    }

    // Insert the new content after the header
    header.insertAdjacentHTML('afterend', contentHTML);

    // Restore form values after re-render (they were wiped with the old DOM)
    if (count > 0) {
      this.restoreFormValues();
    }
  }

  /**
   * Capture current preset form values into persistent state
   */
  captureFormValues() {
    const form = document.getElementById('preset-creator-form');
    if (!form) return;

    const name = form.querySelector('#preset-name')?.value;
    const description = form.querySelector('#preset-description')?.value;
    const prompt = form.querySelector('#preset-prompt')?.value;
    const category = form.querySelector('#preset-category')?.value;

    if (name !== undefined) this.presetFormValues.name = name;
    if (description !== undefined) this.presetFormValues.description = description;
    if (prompt !== undefined) this.presetFormValues.prompt = prompt;
    if (category) this.presetFormValues.category = category;
  }

  /**
   * Restore persisted preset form values into the (re-rendered) form
   */
  restoreFormValues() {
    const form = document.getElementById('preset-creator-form');
    if (!form) return;

    const nameInput = form.querySelector('#preset-name');
    if (nameInput) nameInput.value = this.presetFormValues.name || '';

    const descInput = form.querySelector('#preset-description');
    if (descInput) descInput.value = this.presetFormValues.description || '';

    const promptInput = form.querySelector('#preset-prompt');
    if (promptInput) promptInput.value = this.presetFormValues.prompt || '';

    const categorySelect = form.querySelector('#preset-category');
    if (categorySelect && this.presetFormValues.category) {
      // The preset category may not exist among the hardcoded options
      // (e.g. 'General' from the backend) - add it so the value sticks
      const exists = Array.from(categorySelect.options)
        .some(opt => opt.value === this.presetFormValues.category);
      if (!exists) {
        const opt = document.createElement('option');
        opt.value = this.presetFormValues.category;
        opt.textContent = this.presetFormValues.category;
        categorySelect.prepend(opt);
      }
      categorySelect.value = this.presetFormValues.category;
    }
  }

  /**
   * Reset persisted preset form values
   */
  resetFormValues() {
    this.presetFormValues = { name: '', description: '', prompt: '', category: 'General' };
  }

  /**
   * Render servers in sidebar
   */
  renderServers(servers) {
    console.log('Rendering servers:', servers);

    const serverBrowser = document.querySelector('.server-browser');
    if (serverBrowser) {
      serverBrowser.innerHTML = `
        <div class="browser-header">
          <h3>MCP Servers</h3>
          <span class="server-count">${servers.length} server${servers.length !== 1 ? 's' : ''}</span>
        </div>
        ${servers.length > 0 ? `
          <ul class="server-list">
            ${servers.map(server => {
              const isSelected = this.selectedServer?.id === server.id;
              const statusClass = server.status === 'connected' ? 'connected' : 'disconnected';
              const toggleAction = server.status === 'connected' ? 'disconnect-server' : 'connect-server';
              const toggleIcon = server.status === 'connected' ? '⏸️' : '▶️';
              const capabilitySummary = [
                typeof server.toolsCount === 'number' ? `${server.toolsCount} tools` : null,
                typeof server.resourcesCount === 'number' ? `${server.resourcesCount} resources` : null,
                typeof server.resourceTemplatesCount === 'number' ? `${server.resourceTemplatesCount} templates` : null,
                typeof server.promptsCount === 'number' ? `${server.promptsCount} prompts` : null
              ].filter(Boolean).join(', ');

              return `
                <li class="server-item ${isSelected ? 'selected' : ''} ${statusClass}" data-server-id="${this.escapeAttribute(server.id)}" data-action="select-server">
                  <div class="server-info">
                    <div class="server-header">
                      <h4 class="server-name">${this.escapeHtml(server.name || server.id)}</h4>
                      <span class="server-status ${statusClass}">${server.status === 'connected' ? '🟢' : '🔴'}</span>
                    </div>
                    ${server.description ? `<p class="server-description">${this.escapeHtml(server.description)}</p>` : ''}
                    <div class="server-stats">
                      <span class="server-type">${this.escapeHtml(server.type || 'mcp')}</span>
                      ${capabilitySummary ? `<span class="server-capabilities">${this.escapeHtml(capabilitySummary)}</span>` : ''}
                    </div>
                  </div>
                  <div class="server-actions">
                    <button class="btn-icon" data-action="${toggleAction}" data-server-id="${this.escapeAttribute(server.id)}" title="${server.status === 'connected' ? 'Disconnect' : 'Connect'} server">${toggleIcon}</button>
                    <button class="btn-icon" data-action="server-settings" data-server-id="${this.escapeAttribute(server.id)}" title="Configure server">⚙️</button>
                  </div>
                </li>
              `;
            }).join('')}
          </ul>
        ` : `
          <div class="empty-state">
            <div class="empty-icon">🔌</div>
            <h3>No MCP Servers</h3>
            <p>Connect to an MCP server to explore tools, resources, and prompts.</p>
            <button class="btn btn-primary" data-action="add-server">Add Server</button>
          </div>
        `}
      `;
    }

    if (!this.selectedServer && servers && servers.length > 0) {
      const urlServerId = new URLSearchParams(window.location.search).get('server');
      const initialServer =
        servers.find(server => server.id === urlServerId) ||
        servers.find(server => server.status === 'connected') ||
        servers[0];

      if (initialServer) {
        console.log('Auto-selecting initial server:', initialServer.id);
        this.selectServer(initialServer.id);
      }
    }
  }

  /**
   * Render server content in explorer
   */
  renderServerContent() {
    console.log('Rendering content for server:', this.selectedServer);

    const explorer = document.querySelector('.content-explorer');
    if (!explorer || !this.selectedServer) return;

    const selectedCount = this.selectedItems.size;
    const tools = Array.isArray(this.serverContent?.tools) ? this.serverContent.tools : [];
    const resources = Array.isArray(this.serverContent?.resources) ? this.serverContent.resources : [];
    const resourceTemplates = Array.isArray(this.serverContent?.resourceTemplates) ? this.serverContent.resourceTemplates : [];
    const prompts = Array.isArray(this.serverContent?.prompts) ? this.serverContent.prompts : [];

    explorer.innerHTML = `
      <div class="explorer-header">
        <div class="server-info">
          <h2>${this.escapeHtml(this.selectedServer.name || this.selectedServer.id)}</h2>
          <p>${this.escapeHtml(this.selectedServer.description || `MCP Server: ${this.selectedServer.id}`)}</p>
          <span class="server-status ${this.selectedServer.status === 'connected' ? 'connected' : 'disconnected'}">${this.selectedServer.status === 'connected' ? '🟢 Connected' : '🔴 Disconnected'}</span>
        </div>
        <div class="selection-info">
          <span class="selection-count">${selectedCount} items selected</span>
          <div class="selection-actions" style="display: ${selectedCount > 0 ? 'flex' : 'none'};">
            <button class="btn btn-secondary btn-small" data-action="clear-selection">Clear Selection</button>
            <button class="btn btn-primary btn-small" data-action="create-preset-from-selection">Create Preset</button>
          </div>
        </div>
      </div>
      <nav class="explorer-tabs">
        <button class="tab-button ${this.currentTab === 'tools' ? 'active' : ''}" data-tab="tools" data-action="switch-tab">Tools (${tools.length})</button>
        <button class="tab-button ${this.currentTab === 'resources' ? 'active' : ''}" data-tab="resources" data-action="switch-tab">Resources (${resources.length})</button>
        <button class="tab-button ${this.currentTab === 'resourceTemplates' ? 'active' : ''}" data-tab="resourceTemplates" data-action="switch-tab">Templates (${resourceTemplates.length})</button>
        <button class="tab-button ${this.currentTab === 'prompts' ? 'active' : ''}" data-tab="prompts" data-action="switch-tab">Prompts (${prompts.length})</button>
      </nav>
      <div class="explorer-content">
        <div class="content-controls">
          <div class="search-filter">
            <input type="text" id="content-search" class="search-input" placeholder="Search items..." value="${this.escapeAttribute(this.searchTerm)}">
            <select id="content-category-filter" class="category-filter">
              <option value="" ${this.categoryFilter === '' ? 'selected' : ''}>All Categories</option>
              <option value="file" ${this.categoryFilter === 'file' ? 'selected' : ''}>File Operations</option>
              <option value="web" ${this.categoryFilter === 'web' ? 'selected' : ''}>Web Operations</option>
              <option value="analysis" ${this.categoryFilter === 'analysis' ? 'selected' : ''}>Analysis</option>
              <option value="development" ${this.categoryFilter === 'development' ? 'selected' : ''}>Development</option>
            </select>
          </div>
          <div class="view-controls">
            <button class="view-btn grid-view ${this.currentView === 'grid' ? 'active' : ''}" data-view="grid" data-action="change-content-view">⊞</button>
            <button class="view-btn list-view ${this.currentView === 'list' ? 'active' : ''}" data-view="list" data-action="change-content-view">☰</button>
          </div>
        </div>
        <div class="tab-content ${this.currentTab === 'tools' ? 'active' : ''}" data-tab-content="tools">
          ${tools.length > 0 ? this.renderItemsGrid(tools, 'tool') : this.renderEmptyTabState('tools')}
        </div>
        <div class="tab-content ${this.currentTab === 'resources' ? 'active' : ''}" data-tab-content="resources">
          ${resources.length > 0 ? this.renderItemsGrid(resources, 'resource') : this.renderEmptyTabState('resources')}
        </div>
        <div class="tab-content ${this.currentTab === 'resourceTemplates' ? 'active' : ''}" data-tab-content="resourceTemplates">
          ${resourceTemplates.length > 0 ? this.renderItemsGrid(resourceTemplates, 'resourceTemplate') : this.renderEmptyTabState('resourceTemplates')}
        </div>
        <div class="tab-content ${this.currentTab === 'prompts' ? 'active' : ''}" data-tab-content="prompts">
          ${prompts.length > 0 ? this.renderItemsGrid(prompts, 'prompt') : this.renderEmptyTabState('prompts')}
        </div>
      </div>
    `;

    this.bindDynamicControls();
    this.changeContentView(this.currentView);
    this.filterContent();
    this.updateSelectionUI();
  }

  /**
   * Render welcome state
   */
  renderWelcome() {
    console.log('Rendering welcome state');

    const explorer = document.querySelector('.content-explorer');
    if (!explorer) return;

    explorer.innerHTML = `
      <div class="explorer-welcome">
        <div class="welcome-content">
          <h2>Select an MCP Server</h2>
          <p>Choose a server from the sidebar to explore its tools, resources, and prompts.</p>
          <div class="welcome-features">
            <div class="feature-item">
              <span class="feature-icon">🛠️</span>
              <div>
                <h4>Tools</h4>
                <p>Executable functions and operations</p>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">📦</span>
              <div>
                <h4>Resources</h4>
                <p>Data sources and file references</p>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">🔗</span>
              <div>
                <h4>Templates</h4>
                <p>Parameterized resource URI patterns</p>
              </div>
            </div>
            <div class="feature-item">
              <span class="feature-icon">💭</span>
              <div>
                <h4>Prompts</h4>
                <p>Pre-configured AI prompt templates</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Render the grid/list of items for the active tab
   */
  renderItemsGrid(items, itemType) {
    const viewClass = this.currentView === 'list' ? 'items-grid list-view' : 'items-grid';
    return `
      <div class="${viewClass}">
        ${items.map(item => this.renderItemCard(item, itemType)).join('')}
      </div>
    `;
  }

  /**
   * Render a single tool/resource/prompt card
   */
  renderItemCard(item, itemType) {
    const itemId = item.id || item.name;
    const isSelected = this.selectedItems.has(itemId);
    const iconMap = { tool: '🛠️', resource: '📦', resourceTemplate: '🔗', prompt: '💭' };
    const actionMap = {
      tool: { action: 'test-tool', attribute: 'data-tool-name', icon: '▶️', title: 'Test tool' },
      resource: { action: 'preview-resource', attribute: 'data-resource-name', icon: '👁️', title: 'Preview resource' },
      resourceTemplate: null,
      prompt: { action: 'use-prompt', attribute: 'data-prompt-name', icon: '🚀', title: 'Use prompt' }
    };
    const actionConfig = actionMap[itemType];
    const metaLabel = item.uriTemplate || item.type || (itemType.charAt(0).toUpperCase() + itemType.slice(1));
    const actionButton = actionConfig
      ? `<button class="btn-icon" ${actionConfig.attribute}="${this.escapeAttribute(item.name || itemId)}" data-action="${actionConfig.action}" title="${actionConfig.title}">${actionConfig.icon}</button>`
      : '';

    return `
      <div class="item-card ${itemType}-item ${isSelected ? 'selected' : ''}" data-item-id="${this.escapeAttribute(itemId)}" data-item-type="${itemType}" data-action="toggle-selection">
        <div class="item-header">
          <div class="item-icon ${itemType}-icon">${iconMap[itemType]}</div>
          <h4 class="item-name">${this.escapeHtml(item.name || itemId)}</h4>
          <div class="item-actions">
            ${actionButton}
            ${isSelected ? '<span class="selected-indicator">✓</span>' : ''}
          </div>
        </div>
        ${item.uriTemplate ? `<p class="item-uri-template">${this.escapeHtml(item.uriTemplate)}</p>` : ''}
        ${item.description ? `<p class="item-description">${this.escapeHtml(item.description)}</p>` : ''}
        <div class="item-meta">
          ${item.category ? `<span class="item-category">${this.escapeHtml(item.category)}</span>` : '<span></span>'}
          <span class="item-type">${this.escapeHtml(itemType === 'resourceTemplate' ? 'Template' : metaLabel)}</span>
        </div>
      </div>
    `;
  }

  /**
   * Render empty state for tabs without items
   */
  renderEmptyTabState(type) {
    const config = {
      tools: { icon: '🛠️', title: 'No tools available', description: 'This server doesn\'t expose any tools.' },
      resources: { icon: '📦', title: 'No resources available', description: 'This server doesn\'t provide any resources.' },
      resourceTemplates: { icon: '🔗', title: 'No templates available', description: 'This server doesn\'t expose any resource templates.' },
      prompts: { icon: '💭', title: 'No prompts available', description: 'This server doesn\'t offer any prompt templates.' }
    };
    const state = config[type] || config.tools;
    return `
      <div class="empty-tab-state">
        <div class="empty-icon">${state.icon}</div>
        <h3>${state.title}</h3>
        <p>${state.description}</p>
      </div>
    `;
  }

  /**
   * Keep selected server synchronized with the URL for deep-linking
   */
  updateURLForSelectedServer(serverId) {
    const url = new URL(window.location.href);
    url.searchParams.set('server', serverId);
    window.history.replaceState({}, '', url);
  }

  /**
   * Escape HTML for safe client-side rendering
   */
  escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Escape attribute values
   */
  escapeAttribute(value) {
    return this.escapeHtml(value).replace(/`/g, '&#96;');
  }

  /**
   * Backward-compatible wrapper used by edit/preload flows
   */
  async loadServerContent(serverId) {
    return this.selectServer(serverId);
  }

  /**
   * Backward-compatible wrapper used by edit/preload flows
   */
  async handleServerSelect(serverId) {
    return this.selectServer(serverId);
  }

  /**
   * Update server selection in sidebar
   */
  updateServerSelection(serverId) {
    document.querySelectorAll('.server-item').forEach(item => {
      item.classList.remove('selected');
    });
    
    const selectedItem = document.querySelector(`[data-server-id="${serverId}"]`);
    if (selectedItem) {
      selectedItem.classList.add('selected');
    }
  }

  /**
   * Set loading state
   */
  setLoadingState(isLoading) {
    this.isLoading = isLoading;
    
    document.body.classList.toggle('mcp-loading', isLoading);
    
    // Update UI elements to show loading state
    const loadingElements = document.querySelectorAll('.loading-state');
    loadingElements.forEach(el => {
      el.style.display = isLoading ? 'block' : 'none';
    });
  }

  /**
   * Set error state
   */
  setError(error) {
    const errorElements = document.querySelectorAll('.server-error');
    errorElements.forEach(el => {
      if (error) {
        el.textContent = error;
        el.style.display = 'block';
      } else {
        el.style.display = 'none';
      }
    });
  }

  /**
   * Show notification
   */
  showNotification(message, type = 'info') {
    // Implementation would show a notification
    console.log(`${type.toUpperCase()}: ${message}`);
  }

  /**
   * Show resource preview modal
   */
  showResourcePreview(resource) {
    // Implementation would show resource preview in a modal
    console.log('Showing resource preview:', resource);
  }

  /**
   * Show preset preview modal
   */
  showPresetPreview(presetData) {
    // Implementation would show preset preview in a modal
    console.log('Showing preset preview:', presetData);
  }

  /**
   * Open server settings dialog
   */
  openServerSettings(serverId) {
    console.log('Opening settings for server:', serverId);
  }

  /**
   * Open add server dialog
   */
  openAddServerDialog() {
    console.log('Opening add server dialog');
  }

  /**
   * Open server manager
   */
  openServerManager() {
    console.log('Opening server manager');
  }

  /**
   * Handle URL parameters for preset editing/creation from Preset Library
   */
  handleURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check if we're in edit or create mode
    const mode = urlParams.get('mode');
    const editId = urlParams.get('edit');
    const expanded = urlParams.get('expanded');
    const presetId = urlParams.get('preset');
    
    console.log('🔍 URL Parameters detected:', Object.fromEntries(urlParams));
    
    // Handle preset edit mode (from preset library)
    if (presetId) {
      this.handlePresetEditMode(presetId);
    }
    
    // Handle edit mode
    else if (mode === 'edit' || editId) {
      this.handleEditMode(urlParams);
    }
    
    // Handle create mode
    else if (mode === 'create') {
      this.handleCreateMode(urlParams);
    }
    
    // Handle expanded preset creator
    if (expanded === 'true') {
      this.expandPresetCreator();
    }
  }

  /**
   * Handle edit mode - preload preset data
   */
  async handleEditMode(urlParams) {
    const editId = urlParams.get('edit');
    const serverName = urlParams.get('server');
    const presetName = urlParams.get('presetName');
    const presetDesc = urlParams.get('presetDesc');
    const presetCategory = urlParams.get('presetCategory');
    
    console.log('⚙️ Entering edit mode for preset:', editId);
    
    // Select server if specified
    if (serverName) {
      await this.selectServerByName(serverName);
    }
    
    // Preload selected items
    await this.preloadSelectedItems(urlParams);
    
    // Preload metadata in preset creator form
    this.preloadPresetMetadata({
      name: presetName,
      description: presetDesc ? decodeURIComponent(presetDesc) : '',
      category: presetCategory
    });
    
    // Expand preset creator
    this.expandPresetCreator();
    
    // Show notification
    this.showNotification(`Editing preset: ${presetName || editId}`, 'info');
  }

  /**
   * Handle create mode - setup for new preset creation
   */
  async handleCreateMode(urlParams) {
    console.log('🆕 Entering create mode for new preset');
    
    // Clear any existing selections and stale form values
    this.resetFormValues();
    this.selectedItems.clear();
    this.updateSelectionUI();
    
    // Expand preset creator
    this.expandPresetCreator();
    
    // Show notification
    this.showNotification('Create new preset: Select tools, resources, and prompts', 'info');
  }

  /**
   * Handle preset edit mode - load existing preset for editing
   */
  async handlePresetEditMode(presetId) {
    console.log('📝 Entering preset edit mode for:', presetId);
    
    // Set edit mode flags
    this.isEditMode = true;
    this.editingPresetId = presetId;
    
    try {
      // Fetch preset data from backend
      const response = await fetch(`/api/presets/${presetId}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch preset: ${response.status}`);
      }
      
      const data = await response.json();
      if (!data.success || !data.preset) {
        throw new Error('Preset not found');
      }
      
      const preset = data.preset;
      console.log('✅ Preset loaded:', preset);
      
      // Preload preset metadata in form
      this.preloadPresetMetadata({
        name: preset.name,
        description: preset.description || '',
        category: preset.category || 'General',
        prompt: preset.prompt || ''
      });
      
      // Wait for servers to load and select the appropriate server
      await this.ensureServersLoaded();
      
      // If preset has a server association, select it
      if (preset.serverName) {
        await this.selectServerByName(preset.serverName);
      }
      
      // Preselect items from the preset
      await this.preselectPresetItems(preset);
      
      // Expand preset creator
      this.expandPresetCreator();
      
      // Update preset creator to show correct button text
      this.updatePresetCreatorContent();
      
      // Show notification
      this.showNotification(`Editing preset: ${preset.name}`, 'info');
      
    } catch (error) {
      console.error('❌ Error loading preset for editing:', error);
      this.showNotification('Error loading preset for editing', 'error');
    }
  }

  /**
   * Preselect items from a preset
   */
  async preselectPresetItems(preset) {
    console.log('🎯 Preselecting preset items:', preset.items);
    console.log('🔍 Preset item structure:', JSON.stringify(preset.items, null, 2));
    
    // Clear existing selections
    this.selectedItems.clear();
    
    // Wait for server content to load
    if (this.selectedServer) {
      await this.ensureServerContentLoaded(this.selectedServer.id);
    }
    
    // Add preset items to selection
    if (preset.items && Array.isArray(preset.items)) {
      preset.items.forEach(item => {
        // Handle both string format and object format
        let itemId = null;
        if (typeof item === 'string') {
          // Simple string format (tool name)
          itemId = item;
        } else if (item && item.id) {
          // Object format with id
          itemId = item.id;
        } else if (item && item.name) {
          // Object format with name
          itemId = item.name;
        }
        
        if (itemId) {
          this.selectedItems.add(itemId);
          console.log('✅ Preselected item:', itemId, typeof item === 'object' ? item.type : 'unknown');
        } else {
          console.warn('⚠️ Unable to extract ID from item:', item);
        }
      });
    }
    
    // Update UI to reflect selections
    this.updateSelectionUI();
    
    console.log(`📋 Preselected ${this.selectedItems.size} items from preset`);
  }

  /**
   * Ensure server content is loaded
   */
  async ensureServerContentLoaded(serverId) {
    const hasLoadedCurrentServer =
      this.selectedServer?.id === serverId &&
      this.serverContent &&
      Array.isArray(this.serverContent.tools) &&
      Array.isArray(this.serverContent.resources) &&
      Array.isArray(this.serverContent.resourceTemplates) &&
      Array.isArray(this.serverContent.prompts);

    if (!hasLoadedCurrentServer) {
      console.log('⏳ Loading server content for preselection...');
      await this.loadServerContent(serverId);
    }
  }

  /**
   * Select server by name
   */
  async selectServerByName(serverName) {
    // Wait for servers to load if not already loaded
    await this.ensureServersLoaded();
    
    const serverElement = document.querySelector(`[data-server-id="${serverName}"]`);
    if (serverElement) {
      await this.handleServerSelect(serverName);
      console.log('📡 Server auto-selected:', serverName);
    }
  }

  /**
   * Preload selected items from URL parameters
   */
  async preloadSelectedItems(urlParams) {
    const toolIds = urlParams.get('tools')?.split(',').filter(Boolean) || [];
    const resourceIds = urlParams.get('resources')?.split(',').filter(Boolean) || [];
    const resourceTemplateIds = urlParams.get('resourceTemplates')?.split(',').filter(Boolean) || [];
    const promptIds = urlParams.get('prompts')?.split(',').filter(Boolean) || [];
    
    // Clear existing selections
    this.selectedItems.clear();
    
    // Add items to selection
    [...toolIds, ...resourceIds, ...resourceTemplateIds, ...promptIds].forEach(itemId => {
      this.selectedItems.add(itemId);
    });
    
    console.log('📋 Items preloaded:', {
      tools: toolIds.length,
      resources: resourceIds.length,
      resourceTemplates: resourceTemplateIds.length,
      prompts: promptIds.length,
      total: this.selectedItems.size
    });
    
    // Update display
    this.updateSelectionUI();
  }

  /**
   * Preload metadata in preset creator form
   */
  preloadPresetMetadata(metadata) {
    // Persist in state first: the creator form is re-rendered on every
    // selection change, so DOM writes alone get wiped. restoreFormValues()
    // re-applies these values after each re-render.
    if (metadata.name) this.presetFormValues.name = metadata.name;
    if (metadata.description) this.presetFormValues.description = metadata.description;
    if (metadata.category) this.presetFormValues.category = metadata.category;
    if (metadata.prompt) this.presetFormValues.prompt = metadata.prompt;

    // Also write directly into the form if it already exists
    setTimeout(() => {
      this.restoreFormValues();
      console.log('📝 Metadata preloaded:', metadata);
    }, 500); // Give time for DOM to update
  }

  /**
   * Expand preset creator panel
   */
  expandPresetCreator() {
    setTimeout(() => {
      const creatorPanel = document.querySelector('.preset-creator');
      if (creatorPanel) {
        creatorPanel.classList.add('expanded');
        creatorPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 1000); // Give time for content to load
  }

  /**
   * Ensure servers are loaded before proceeding
   */
  async ensureServersLoaded() {
    if (!this.selectedServer && this.isLoading) {
      // Wait for servers to load
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (!this.isLoading) {
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });
    }
  }

  /**
   * Show notification message
   */
  showNotification(message, type = 'info') {
    // Create notification if not exists
    let notification = document.querySelector('.mcp-editor-notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'mcp-editor-notification';
      document.querySelector('.mcp-editor-container').prepend(notification);
    }
    
    notification.textContent = message;
    notification.className = `mcp-editor-notification ${type}`;
    notification.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      notification.style.display = 'none';
    }, 5000);
  }
}

// Initialize MCP Editor when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.mcp-editor-container')) {
    window.mcpEditor = new MCPEditor();
  }
});