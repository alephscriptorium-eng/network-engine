/**
 * Settings View Client-side JavaScript
 * Handles settings form interactions, API calls, and real-time updates
 * Following diogenes patterns with progressive enhancement
 */

const ZeusSettings = {
  
  // Configuration
  config: {
    apiBase: '/api/settings',
    debounceDelay: 500,
    notificationDuration: 3000
  },
  
  // State management
  state: {
    currentSettings: {},
    unsavedChanges: false,
    isLoading: false
  },
  
  /**
   * Initialize settings interface
   */
  init() {
    console.log('Initializing Zeus Settings interface...');
    
    // Check if we're on the settings page
    const settingsForm = document.getElementById('zeus-settings-form');
    if (!settingsForm) {
      return; // Not on settings page
    }
    
    this.bindEvents();
    this.loadCurrentSettings();
    this.setupThemePreview();
    
    console.log('Zeus Settings interface initialized');
  },
  
  /**
   * Bind event listeners with progressive enhancement
   */
  bindEvents() {
    const form = document.getElementById('zeus-settings-form');
    
    // Theme selector
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect) {
      themeSelect.addEventListener('change', (e) => {
        this.handleThemeChange(e.target.value);
      });
    }
    
    // Language selector
    const languageSelect = document.getElementById('language-select');
    if (languageSelect) {
      languageSelect.addEventListener('change', (e) => {
        this.handleLanguageChange(e.target.value);
      });
    }
    
    // All toggle switches (animations, dark mode, features)
    const toggles = form.querySelectorAll('.setting-toggle');
    toggles.forEach(toggle => {
      toggle.addEventListener('change', (e) => {
        this.handleToggleChange(e.target);
      });
    });
    
    // Text/number inputs (AI config, MCP config)
    const inputs = form.querySelectorAll('input[type=\"text\"], input[type=\"url\"], input[type=\"number\"], select:not(#theme-select):not(#language-select)');
    inputs.forEach(input => {
      // Debounce input changes
      let timeoutId;
      input.addEventListener('input', (e) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          this.handleInputChange(e.target);
        }, this.config.debounceDelay);
      });
    });
    
    // Save button
    const saveButton = document.getElementById('save-settings');
    if (saveButton) {
      saveButton.addEventListener('click', () => {
        this.saveAllSettings();
      });
    }
    
    // Reset button
    const resetButton = document.getElementById('reset-settings');
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        this.resetToDefaults();
      });
    }
    
    // Warn about unsaved changes
    window.addEventListener('beforeunload', (e) => {
      if (this.state.unsavedChanges) {
        e.preventDefault();
        e.returnValue = 'You have unsaved settings changes. Are you sure you want to leave?';
      }
    });
  },
  
  /**
   * Load current settings from API
   */
  async loadCurrentSettings() {
    try {
      this.setLoading(true);
      
      const response = await fetch(this.config.apiBase);
      if (!response.ok) {
        throw new Error(`Failed to load settings: ${response.statusText}`);
      }
      
      const settings = await response.json();
      this.state.currentSettings = settings;
      
      // Update form with current settings
      this.populateForm(settings);
      
      this.showNotification('Settings loaded successfully', 'success');
      
    } catch (error) {
      console.error('Error loading settings:', error);
      this.showNotification('Failed to load settings', 'error');
    } finally {
      this.setLoading(false);
    }
  },
  
  /**
   * Handle theme change with live preview
   */
  async handleThemeChange(newTheme) {
    try {
      // Update theme immediately for preview
      this.applyThemePreview(newTheme);
      
      // Save to backend
      const response = await this.updateSettingsSection('theme', { current: newTheme });
      
      if (response.success) {
        this.state.currentSettings.theme.current = newTheme;
        this.showNotification(`Theme changed to ${newTheme}`, 'success');
        
        // Apply theme globally
        this.applyThemeGlobally(newTheme);
      } else {
        throw new Error(response.error || 'Failed to update theme');
      }
      
    } catch (error) {
      console.error('Error changing theme:', error);
      this.showNotification('Failed to change theme', 'error');
      // Revert theme selector
      document.getElementById('theme-select').value = this.state.currentSettings.theme.current;
    }
  },
  
  /**
   * Handle language change
   */
  async handleLanguageChange(newLanguage) {
    try {
      const response = await this.updateSettingsSection('ui', { language: newLanguage });
      
      if (response.success) {
        this.state.currentSettings.ui.language = newLanguage;
        this.showNotification(`Language changed to ${newLanguage}`, 'success');
        
        // Note: Full i18n implementation would reload strings here
        setTimeout(() => {
          this.showNotification('Language will apply on next page reload', 'info');
        }, 1000);
        
      } else {
        throw new Error(response.error || 'Failed to update language');
      }
      
    } catch (error) {
      console.error('Error changing language:', error);
      this.showNotification('Failed to change language', 'error');
    }
  },
  
  /**
   * Handle toggle switch changes (animations, dark mode, features)
   */
  async handleToggleChange(toggle) {
    const section = toggle.dataset.section;
    const field = toggle.dataset.field;
    const value = toggle.checked;
    
    try {
      const updateData = { [field]: value };
      const response = await this.updateSettingsSection(section, updateData);
      
      if (response.success) {
        // Update local state
        if (!this.state.currentSettings[section]) {
          this.state.currentSettings[section] = {};
        }
        this.state.currentSettings[section][field] = value;
        
        this.showNotification(`${field} ${value ? 'enabled' : 'disabled'}`, 'success');
        
        // Apply immediate effects for certain toggles
        if (field === 'animations') {
          this.applyAnimationSettings(value);
        }
        
      } else {
        throw new Error(response.error || 'Failed to update setting');
      }
      
    } catch (error) {
      console.error('Error updating toggle:', error);
      this.showNotification(`Failed to update ${field}`, 'error');
      // Revert toggle state
      toggle.checked = !toggle.checked;
    }
  },
  
  /**
   * Handle input field changes (AI config, MCP settings, etc.)
   */
  async handleInputChange(input) {
    const section = input.dataset.section;
    const field = input.dataset.field;
    let value = input.value;
    
    // Type conversion based on input type
    if (input.type === 'number') {
      value = parseFloat(value);
      if (isNaN(value)) return; // Skip invalid numbers
    }
    
    try {
      const updateData = { [field]: value };
      const response = await this.updateSettingsSection(section, updateData);
      
      if (response.success) {
        // Update local state
        if (!this.state.currentSettings[section]) {
          this.state.currentSettings[section] = {};
        }
        this.state.currentSettings[section][field] = value;
        
        // Show subtle success indication
        input.classList.add('setting-saved');
        setTimeout(() => {
          input.classList.remove('setting-saved');
        }, 1000);
        
      } else {
        throw new Error(response.error || 'Failed to update setting');
      }
      
    } catch (error) {
      console.error('Error updating input:', error);
      // Show error state
      input.classList.add('setting-error');
      setTimeout(() => {
        input.classList.remove('setting-error');
      }, 2000);
    }
  },
  
  /**
   * Save all settings (bulk operation)
   */
  async saveAllSettings() {
    try {
      this.setLoading(true);
      
      // Collect all form data
      const formData = this.collectFormData();
      
      // Send bulk update (if backend supports it, otherwise update section by section)
      const promises = Object.keys(formData).map(section => {
        return this.updateSettingsSection(section, formData[section]);
      });
      
      const results = await Promise.all(promises);
      
      // Check if all updates succeeded
      const allSuccessful = results.every(result => result.success);
      
      if (allSuccessful) {
        this.state.unsavedChanges = false;
        this.showNotification('All settings saved successfully', 'success');
      } else {
        this.showNotification('Some settings failed to save', 'warning');
      }
      
    } catch (error) {
      console.error('Error saving settings:', error);
      this.showNotification('Failed to save settings', 'error');
    } finally {
      this.setLoading(false);
    }
  },
  
  /**
   * Reset settings to defaults
   */
  async resetToDefaults() {
    if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
      return;
    }
    
    try {
      this.setLoading(true);
      
      // Note: This would require a backend endpoint for defaults
      // For now, we'll just reload current settings
      await this.loadCurrentSettings();
      
      this.showNotification('Settings reset (reload required for full reset)', 'info');
      
    } catch (error) {
      console.error('Error resetting settings:', error);
      this.showNotification('Failed to reset settings', 'error');
    } finally {
      this.setLoading(false);
    }
  },
  
  /**
   * Update specific settings section via API
   */
  async updateSettingsSection(section, data) {
    const response = await fetch(`${this.config.apiBase}/${section}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  },
  
  /**
   * Apply theme preview in real-time
   */
  applyThemePreview(themeName) {
    // Update body class for theme
    document.body.className = document.body.className.replace(/theme-[\w-]+/g, '');
    document.body.classList.add(`theme-${themeName}`);
    
    // Update theme CSS link
    const themeLink = document.querySelector('link[href*=\"/assets/themes/\"]');
    if (themeLink) {
      themeLink.href = `/assets/themes/${themeName}.css`;
    }
    
    // Update theme preview colors
    this.updateThemePreviewColors(themeName);
  },
  
  /**
   * Apply theme globally (same as preview for now)
   */
  applyThemeGlobally(themeName) {
    this.applyThemePreview(themeName);
  },
  
  /**
   * Update theme preview colors
   */
  updateThemePreviewColors(themeName) {
    const preview = document.getElementById('theme-preview');
    if (!preview) return;
    
    // Update preview area with theme name
    preview.setAttribute('data-theme', themeName);
    
    // Theme-specific color previews could be implemented here
    const colors = preview.querySelectorAll('.color-primary, .color-secondary, .color-accent');
    colors.forEach(color => {
      color.setAttribute('data-theme', themeName);
    });
  },
  
  /**
   * Setup theme preview functionality
   */
  setupThemePreview() {
    const themeSelect = document.getElementById('theme-select');
    if (themeSelect && this.state.currentSettings.theme) {
      this.updateThemePreviewColors(this.state.currentSettings.theme.current);
    }
  },
  
  /**
   * Apply animation settings
   */
  applyAnimationSettings(enabled) {
    document.body.classList.toggle('animations-disabled', !enabled);
  },
  
  /**
   * Populate form with current settings
   */
  populateForm(settings) {
    // This function would populate form fields with current values
    // Most values should already be set by the server-side rendering
    // This is mainly for dynamic updates
    
    console.log('Form populated with current settings');
  },
  
  /**
   * Collect all form data
   */
  collectFormData() {
    const form = document.getElementById('zeus-settings-form');
    const formData = {};
    
    // Collect data by sections (no 'ai' section in this build)
    const sections = ['theme', 'ui', 'features', 'discovery', 'presets'];
    
    sections.forEach(section => {
      formData[section] = {};
      
      const sectionElements = form.querySelectorAll(`[data-section=\"${section}\"]`);
      sectionElements.forEach(element => {
        const field = element.dataset.field;
        let value = element.type === 'checkbox' ? element.checked : element.value;
        
        if (element.type === 'number') {
          value = parseFloat(value);
        }
        
        formData[section][field] = value;
      });
    });
    
    return formData;
  },
  
  /**
   * Show notification message
   */
  showNotification(message, type = 'info') {
    const container = document.getElementById('settings-messages');
    if (!container) return;
    
    // Remove existing notifications
    container.innerHTML = '';
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `settings-notification notification-${type}`;
    notification.innerHTML = `
      <span class=\"notification-icon\">${this.getNotificationIcon(type)}</span>
      <span class=\"notification-message\">${message}</span>
      <button class=\"notification-close\" onclick=\"this.parentElement.remove()\">&times;</button>
    `;
    
    container.appendChild(notification);
    
    // Auto-remove notification
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, this.config.notificationDuration);
  },
  
  /**
   * Get icon for notification type
   */
  getNotificationIcon(type) {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type] || icons.info;
  },
  
  /**
   * Set loading state
   */
  setLoading(isLoading) {
    this.state.isLoading = isLoading;
    const form = document.getElementById('zeus-settings-form');
    
    if (form) {
      form.classList.toggle('settings-loading', isLoading);
    }
    
    // Disable/enable form elements during loading
    const inputs = form.querySelectorAll('input, select, button');
    inputs.forEach(input => {
      input.disabled = isLoading;
    });
  }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ZeusSettings.init());
} else {
  ZeusSettings.init();
}

// Export for potential external use
window.ZeusSettings = ZeusSettings;