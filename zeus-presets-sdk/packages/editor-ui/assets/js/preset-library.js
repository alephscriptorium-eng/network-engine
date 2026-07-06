/**
 * Preset Library JavaScript - Zeus MCP Mesh SDK
 * Clean, modern implementation with focus on user experience
 */

class PresetLibrary {
  constructor() {
    this.currentFilters = {
      search: '',
      category: '',
      sort: 'updatedAt_desc',
      view: 'grid'
    };
    
    this.currentPage = 1;
    this.showEditor = false;
    this.selectedPreset = null;
    this.mcpDetailsVisible = false;
    
    this.init();
  }

  init() {
    console.log('🎯 Preset Library initialized');
    this.bindEvents();
    
    // Check if we have initial data from server-side rendering
    if (this.hasInitialData()) {
      console.log('📊 Using server-side rendered data');
      this.renderInitialData();
    } else {
      console.log('🔄 Loading data via AJAX');
      this.loadPresets();
    }
    
    this.setupRealtimeUpdates();
  }

  hasInitialData() {
    // Check if preset cards are already rendered
    const presetCards = document.querySelectorAll('.preset-card');
    return presetCards.length > 0;
  }

  renderInitialData() {
    // Count existing presets and update states
    const presetCards = document.querySelectorAll('.preset-card');
    const pagination = {
      page: 1,
      totalPages: 1,
      total: presetCards.length
    };
    
    console.log(`📋 Found ${presetCards.length} presets from server-side rendering`);
    
    // Update any dynamic counters or states if needed
    this.updateMCPServerStatus();
  }

  updateMCPServerStatus() {
    // Check if MCP servers are connected based on preset data
    const connectedPresets = document.querySelectorAll('.preset-card').length;
    const mcpStatusSection = document.querySelector('.mcp-status');
    
    if (mcpStatusSection) {
      const serverStatus = mcpStatusSection.textContent.includes('No servers connected');
      if (serverStatus && connectedPresets > 0) {
        console.log('🔄 Updating MCP server status based on preset data');
        // The server should handle this, but we can add client-side updates if needed
      }
    }
  }

  bindEvents() {
    // Search functionality
    this.bindSearchEvents();
    
    // Filter and sort events
    this.bindFilterEvents();
    
    // Preset actions
    this.bindPresetActions();
    
    // Editor events
    this.bindEditorEvents();
    
    // MCP integration events
    this.bindMCPEvents();
    
    // View and pagination events
    this.bindViewEvents();
  }

  bindSearchEvents() {
    const searchInput = document.getElementById('main-search');
    const searchBtn = document.querySelector('[data-action="search"]');
    
    if (searchInput) {
      // Debounced search
      let searchTimeout;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.currentFilters.search = e.target.value;
          this.currentPage = 1;
          this.loadPresets();
        }, 300);
      });
      
      // Enter key search
      searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.performSearch();
        }
      });
    }
    
    if (searchBtn) {
      searchBtn.addEventListener('click', () => this.performSearch());
    }
  }

  bindFilterEvents() {
    // Category filters
    document.addEventListener('change', (e) => {
      if (e.target.name === 'category') {
        this.currentFilters.category = e.target.value;
        this.currentPage = 1;
        this.loadPresets();
      }
    });
    
    // Sort select
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentFilters.sort = e.target.value;
        this.loadPresets();
      });
    }
  }

  bindPresetActions() {
    document.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      const presetId = e.target.dataset.presetId;
      
      switch (action) {
        case 'create-preset':
          this.createNewPreset();
          break;
        case 'download-preset':
          this.downloadPreset(presetId);
          break;
        case 'edit-preset':
          this.editPreset(presetId);
          break;
        case 'delete-preset':
          this.deletePreset(presetId);
          break;
        case 'duplicate-preset':
          this.duplicatePreset(presetId);
          break;
        case 'retry-load':
          this.loadPresets();
          break;
      }
    });
  }

  bindEditorEvents() {
    document.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      
      switch (action) {
        case 'close-editor':
          this.closeEditor();
          break;
        case 'save-preset':
          this.savePreset();
          break;
        case 'cancel-edit':
          this.cancelEdit();
          break;
      }
    });
    
    // Form validation and character counting
    this.bindFormEvents();
  }

  bindMCPEvents() {
    document.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      
      switch (action) {
        case 'toggle-mcp-browser':
          this.toggleMCPBrowser();
          break;
        case 'toggle-mcp-details':
          this.toggleMCPDetails();
          break;
        case 'open-mcp-editor':
          this.openMCPEditor();
          break;
      }
    });
  }

  bindViewEvents() {
    document.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      
      switch (action) {
        case 'change-view':
          this.changeView(e.target.dataset.view);
          break;
        case 'change-page':
          this.changePage(parseInt(e.target.dataset.page));
          break;
      }
    });
  }

  bindFormEvents() {
    // Character counting for prompt field
    const promptField = document.getElementById('preset-prompt');
    if (promptField) {
      promptField.addEventListener('input', (e) => {
        const count = e.target.value.length;
        const counter = document.getElementById('prompt-count');
        if (counter) {
          counter.textContent = count;
          counter.style.color = count > 2000 ? 'var(--error-color)' : 'var(--text-secondary)';
        }
      });
    }
    
    // Real-time form validation
    const form = document.getElementById('preset-form');
    if (form) {
      form.addEventListener('input', () => this.validateForm());
    }
  }

  // ===== CORE FUNCTIONALITY =====

  async loadPresets() {
    try {
      this.showLoading(true);
      
      const params = new URLSearchParams({
        page: this.currentPage,
        limit: 12,
        ...this.currentFilters
      });
      
      const response = await fetch(`/api/presets?${params}`);
      const data = await response.json();
      
      if (data.success) {
        this.renderPresets(data.presets, data.pagination);
      } else {
        this.showError(data.error || 'Failed to load presets');
      }
    } catch (error) {
      console.error('❌ Error loading presets:', error);
      this.showError('Network error while loading presets');
    } finally {
      this.showLoading(false);
    }
  }

  async loadMCPServers() {
    try {
      const response = await fetch('/api/mcp/servers');
      const data = await response.json();
      
      if (data.success) {
        this.renderMCPStatus(data.servers);
      }
    } catch (error) {
      console.error('❌ Error loading MCP servers:', error);
    }
  }

  performSearch() {
    const searchInput = document.getElementById('main-search');
    if (searchInput) {
      this.currentFilters.search = searchInput.value;
      this.currentPage = 1;
      this.loadPresets();
    }
  }

  // ===== PRESET ACTIONS =====

  createNewPreset() {
    console.log('🆕 Creating new preset');
    this.selectedPreset = null;
    this.showEditor = true;
    this.renderEditor();
  }

  async downloadPreset(presetId) {
    console.log('⬇️ Downloading preset:', presetId);

    try {
      const response = await fetch(`/api/presets/${presetId}/download`);
      if (!response.ok) {
        this.showNotification('Failed to download preset', 'error');
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition');
      let filename = 'preset.preset.zip';
      const match = disposition?.match(/filename="([^"]+)"/);
      if (match) {
        filename = match[1];
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);

      this.showNotification('Preset downloaded', 'success');
    } catch (error) {
      console.error('❌ Error downloading preset:', error);
      this.showNotification('Error downloading preset', 'error');
    }
  }

  async editPreset(presetId) {
    console.log('✏️ Editing preset:', presetId);
    
    try {
      // Navigate to MCP Editor with preset parameter
      window.location.href = `/editor?preset=${presetId}`;
    } catch (error) {
      console.error('❌ Error navigating to editor:', error);
      this.showNotification('Error opening preset editor', 'error');
    }
  }

  async deletePreset(presetId) {
    if (!confirm('Are you sure you want to delete this preset? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/presets/${presetId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.showNotification('Preset deleted successfully', 'success');
        // Reload the page to get fresh server-side rendered data
        window.location.reload();
      } else {
        this.showNotification(data.error || 'Error deleting preset', 'error');
      }
    } catch (error) {
      console.error('❌ Error deleting preset:', error);
      this.showNotification('Network error while deleting preset', 'error');
    }
  }

  async duplicatePreset(presetId) {
    try {
      const response = await fetch(`/api/presets/${presetId}/duplicate`, {
        method: 'POST'
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.showNotification('Preset duplicated successfully', 'success');
        this.loadPresets();
      } else {
        this.showNotification(data.error || 'Error duplicating preset', 'error');
      }
    } catch (error) {
      console.error('❌ Error duplicating preset:', error);
      this.showNotification('Network error while duplicating preset', 'error');
    }
  }

  // ===== EDITOR FUNCTIONALITY =====

  renderEditor() {
    // In a real implementation, this would update the UI to show the editor
    // For now, we'll use the existing template rendering approach
    window.location.href = `/presets?editor=true${this.selectedPreset ? `&preset=${this.selectedPreset.id}` : ''}`;
  }

  closeEditor() {
    this.showEditor = false;
    this.selectedPreset = null;
    window.location.href = '/presets';
  }

  cancelEdit() {
    if (this.hasUnsavedChanges()) {
      if (confirm('You have unsaved changes. Are you sure you want to cancel?')) {
        this.closeEditor();
      }
    } else {
      this.closeEditor();
    }
  }

  async savePreset() {
    if (!this.validateForm()) {
      this.showNotification('Please fill in all required fields correctly', 'error');
      return;
    }
    
    const formData = this.getFormData();
    const isEditing = !!this.selectedPreset;
    
    try {
      const url = isEditing ? `/api/presets/${this.selectedPreset.id}` : '/api/presets';
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        this.showNotification(
          isEditing ? 'Preset updated successfully' : 'Preset created successfully',
          'success'
        );
        this.closeEditor();
      } else {
        this.showNotification(data.error || 'Error saving preset', 'error');
      }
    } catch (error) {
      console.error('❌ Error saving preset:', error);
      this.showNotification('Network error while saving preset', 'error');
    }
  }

  validateForm() {
    const form = document.getElementById('preset-form');
    if (!form) return false;
    
    const name = form.querySelector('#preset-name')?.value?.trim();
    const category = form.querySelector('#preset-category')?.value;
    const prompt = form.querySelector('#preset-prompt')?.value?.trim();
    
    return name && category && prompt && prompt.length <= 2000;
  }

  getFormData() {
    const form = document.getElementById('preset-form');
    if (!form) return {};
    
    return {
      name: form.querySelector('#preset-name')?.value?.trim(),
      category: form.querySelector('#preset-category')?.value,
      description: form.querySelector('#preset-description')?.value?.trim(),
      prompt: form.querySelector('#preset-prompt')?.value?.trim(),
      tags: form.querySelector('#preset-tags')?.value?.split(',').map(t => t.trim()).filter(t => t)
    };
  }

  hasUnsavedChanges() {
    if (!this.selectedPreset) return false;
    
    const currentData = this.getFormData();
    return JSON.stringify(currentData) !== JSON.stringify({
      name: this.selectedPreset.name,
      category: this.selectedPreset.category,
      description: this.selectedPreset.description || '',
      prompt: this.selectedPreset.prompt,
      tags: this.selectedPreset.tags || []
    });
  }

  // ===== MCP FUNCTIONALITY =====

  toggleMCPBrowser() {
    // Navigate to MCP Editor
    window.location.href = '/editor';
  }

  toggleMCPDetails() {
    this.mcpDetailsVisible = !this.mcpDetailsVisible;
    const details = document.getElementById('mcp-details');
    const button = document.querySelector('[data-action="toggle-mcp-details"]');
    
    if (details) {
      if (this.mcpDetailsVisible) {
        details.style.display = 'block';
        if (button) button.textContent = 'Hide';
      } else {
        details.style.display = 'none';
        if (button) button.textContent = 'Details';
      }
    }
    
    console.log('🔍 MCP Details toggled:', this.mcpDetailsVisible ? 'visible' : 'hidden');
  }

  openMCPEditor() {
    window.location.href = '/editor';
  }

  renderMCPStatus(servers) {
    // This would be handled by server-side rendering in our architecture
    // But we can update the status indicators
    const connectedServers = servers.filter(s => s.status === 'connected');
    console.log(`📡 MCP Status: ${connectedServers.length} servers connected`);
  }

  // ===== VIEW AND PAGINATION =====

  changeView(viewType) {
    this.currentFilters.view = viewType;
    
    // Update UI
    document.querySelectorAll('.view-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.view === viewType);
    });
    
    const presetItems = document.querySelector('.preset-items');
    if (presetItems) {
      presetItems.className = `preset-items ${viewType}-view`;
    }
  }

  changePage(page) {
    if (page < 1) return;
    
    this.currentPage = page;
    this.loadPresets();
  }

  // ===== UI HELPERS =====

  showLoading(show) {
    const grid = document.querySelector('.preset-grid');
    if (!grid) return;
    
    if (show) {
      grid.classList.add('loading');
      grid.innerHTML = '<div class="loading-spinner">Loading presets...</div>';
    } else {
      grid.classList.remove('loading');
      // Clear loading content - renderPresets will populate with actual content
    }
  }

  showError(message) {
    const grid = document.querySelector('.preset-grid');
    if (!grid) return;
    
    grid.classList.add('error');
    grid.innerHTML = `
      <div class="error-message">
        <h3>Error Loading Presets</h3>
        <p>${message}</p>
        <button class="btn btn-primary" data-action="retry-load">Retry</button>
      </div>
    `;
  }

  showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
    
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
  }

  renderPresets(presets, pagination) {
    console.log(`📋 Rendered ${presets.length} presets (page ${pagination.page} of ${pagination.totalPages})`);
    
    const grid = document.querySelector('.preset-grid');
    if (!grid) return;
    
    // Clear existing content
    grid.innerHTML = '';
    
    if (presets.length === 0) {
      grid.innerHTML = '<div class="no-presets">No presets found matching your criteria.</div>';
      return;
    }
    
    // Generate HTML for each preset
    presets.forEach(preset => {
      const presetCard = this.createPresetCard(preset);
      grid.appendChild(presetCard);
    });
  }
  
  createPresetCard(preset) {
    const article = document.createElement('article');
    article.className = 'preset-card';
    article.setAttribute('data-preset-id', preset.id);
    
    const serverStatus = preset.serverStatus === 'connected' ? '🟢' : '⚪';
    const serverName = preset.serverName || 'No Server';
    const formatTimeAgo = (dateStr) => {
      const date = new Date(dateStr);
      const now = new Date();
      const diff = now - date;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 1) return 'Just now';
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    };
    
    article.innerHTML = `
      <div class="card-header">
        <div class="card-title">
          <h3>${preset.name}</h3>
          <span class="card-category">${preset.category}</span>
        </div>
        <div class="card-server">
          <span class="server-status">${serverStatus}</span>
          <span class="server-name">${serverName}</span>
        </div>
      </div>
      
      <div class="card-content">
        <p class="card-description">${preset.description || 'No description provided'}</p>
      </div>
      
      <div class="card-actions">
        <button class="btn btn-primary" data-action="download-preset" data-preset-id="${preset.id}">Download Preset</button>
        <button class="btn btn-secondary" data-action="edit-preset" data-preset-id="${preset.id}">Edit</button>
        <button class="btn btn-secondary btn-icon" data-action="delete-preset" data-preset-id="${preset.id}" title="Delete preset">🗑️</button>
      </div>
      
      <div class="card-footer">
        <span class="last-updated">${formatTimeAgo(preset.updatedAt || preset.createdAt)}</span>
      </div>
    `;
    
    return article;
  }

  // ===== REALTIME UPDATES =====

  setupRealtimeUpdates() {
    // Setup WebSocket connection for real-time updates
    if (window.WebSocket && window.zeusSocket) {
      window.zeusSocket.on('preset:updated', (data) => {
        console.log('📡 Preset updated:', data);
        this.loadPresets();
      });
      
      window.zeusSocket.on('preset:deleted', (data) => {
        console.log('📡 Preset deleted:', data);
        this.loadPresets();
      });
      
      window.zeusSocket.on('mcp:server:status', (data) => {
        console.log('📡 MCP server status update:', data);
        this.loadMCPServers();
      });
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  if (document.querySelector('.preset-library')) {
    window.presetLibrary = new PresetLibrary();
  }
});

// Global helper for other scripts
window.PresetLibrary = PresetLibrary;