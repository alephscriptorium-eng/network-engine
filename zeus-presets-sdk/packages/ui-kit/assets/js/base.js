/**
 * Zeus MCP Mesh SDK - Client-side JavaScript
 * Base functionality for theme switching and UI interactions
 */

// Configuration and state management
const Zeus = {
  config: {},
  
  // Initialize the application
  init() {
    this.loadConfig();
    this.bindEvents();
    console.log('Zeus MCP Mesh SDK initialized');
  },
  
  // Load configuration from server
  async loadConfig() {
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        this.config = await response.json();
      }
    } catch (error) {
      console.warn('Could not load configuration:', error);
      this.config = { theme: { current: 'Black-White-MCP' } };
    }
  },
  
  // Bind event listeners
  bindEvents() {
    // Theme switching
    document.addEventListener('click', (e) => {
      if (e.target.matches('[data-theme-switch]')) {
        e.preventDefault();
        const theme = e.target.getAttribute('data-theme-switch');
        this.switchTheme(theme);
      }
    });
    
    // Navigation active state
    this.updateNavigationState();
  },
  
  // Switch theme functionality
  async switchTheme(themeName) {
    try {
      const response = await fetch('/api/theme/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ theme: themeName })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        // Update body class
        document.body.className = document.body.className
          .replace(/theme-[\w-]+/, `theme-${themeName}`);
        
        // Update theme CSS link
        this.updateThemeCSS(themeName);
        
        // Update config
        this.config.theme.current = themeName;
        
        // Show success message
        this.showNotification(`Theme switched to ${themeName}`, 'success');
        
        console.log('Theme switched successfully:', result);
      } else {
        throw new Error('Failed to switch theme');
      }
    } catch (error) {
      console.error('Error switching theme:', error);
      this.showNotification('Failed to switch theme', 'error');
    }
  },
  
  // Update theme CSS link
  updateThemeCSS(themeName) {
    const existingLink = document.querySelector('link[href*="/assets/themes/"]');
    if (existingLink) {
      existingLink.href = `/assets/themes/${themeName}.css`;
    }
  },
  
  // Update navigation active state
  updateNavigationState() {
    const currentPath = window.location.pathname;
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPath || (currentPath === '/' && href === '/')) {
        link.classList.add('current');
      } else {
        link.classList.remove('current');
      }
    });
  },
  
  // Show notification
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to DOM
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
      notification.remove();
    }, 3000);
  },
  
  // Utility: Fetch with error handling
  async fetchAPI(endpoint, options = {}) {
    try {
      const response = await fetch(endpoint, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
};

// Notification styles (injected dynamically)
const notificationStyles = `
  .notification {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 1rem 1.5rem;
    border-radius: 0.375rem;
    color: white;
    font-weight: 600;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  }
  
  .notification-success {
    background-color: var(--success-color);
  }
  
  .notification-error {
    background-color: var(--danger-color);
  }
  
  .notification-info {
    background-color: var(--info-color);
  }
  
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;

// Inject notification styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => Zeus.init());
} else {
  Zeus.init();
}

// Export for module use if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Zeus;
}

if (typeof window !== 'undefined') {
  window.Zeus = Zeus;
}