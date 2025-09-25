/**
 * @file PluginManager.js
 * @description Plugin management system for extensible cricket simulation
 * @module core/match-engine/PluginManager
 */

/**
 * @typedef {Object} Plugin
 * @property {string} id - Unique plugin ID
 * @property {string} name - Plugin name
 * @property {string} version - Plugin version
 * @property {string} description - Plugin description
 * @property {Array} dependencies - Plugin dependencies
 * @property {Object} config - Plugin configuration
 * @property {Function} install - Install function
 * @property {Function} uninstall - Uninstall function
 * @property {Function} activate - Activate function
 * @property {Function} deactivate - Deactivate function
 * @property {Object} hooks - Plugin hooks
 * @property {Object} api - Plugin API
 * @property {Object} metadata - Plugin metadata
 */

/**
 * @typedef {Object} PluginHook
 * @property {string} name - Hook name
 * @property {Function} handler - Hook handler
 * @property {number} priority - Hook priority
 * @property {Object} options - Hook options
 */

class PluginManager {
  constructor(eventSystem) {
    this.eventSystem = eventSystem;

    // Plugin registry
    this.plugins = new Map();
    this.activePlugins = new Set();

    // Hook system
    this.hooks = new Map();

    // API registry for plugins
    this.apis = new Map();

    // Dependency resolver
    this.dependencies = new Map();

    // Plugin loader
    this.loaders = new Map();

    // Security manager
    this.security = {
      allowedDomains: [],
      restrictedAPIs: [],
      sandboxing: true
    };

    // Configuration
    this.config = {
      autoActivate: true,
      validateDependencies: true,
      enableSandboxing: true,
      maxPlugins: 100,
      enableHotReload: false
    };

    this.registerDefaultLoaders();
    this.setupCoreHooks();
  }

  /**
   * Register a plugin
   * @param {Plugin} plugin - Plugin to register
   * @returns {Promise<boolean>} Success status
   */
  async register(plugin) {
    try {
      // Validate plugin
      if (!this.validatePlugin(plugin)) {
        throw new Error(`Invalid plugin: ${plugin.id || 'unknown'}`);
      }

      // Check if already registered
      if (this.plugins.has(plugin.id)) {
        throw new Error(`Plugin ${plugin.id} is already registered`);
      }

      // Validate dependencies
      if (this.config.validateDependencies && !this.validateDependencies(plugin)) {
        throw new Error(`Plugin ${plugin.id} has unmet dependencies`);
      }

      // Install plugin
      if (plugin.install) {
        await plugin.install(this.createPluginContext(plugin));
      }

      // Register plugin
      this.plugins.set(plugin.id, {
        ...plugin,
        status: 'registered',
        registeredAt: Date.now()
      });

      // Register hooks
      this.registerPluginHooks(plugin);

      // Register API
      this.registerPluginAPI(plugin);

      // Auto-activate if configured
      if (this.config.autoActivate) {
        await this.activate(plugin.id);
      }

      this.eventSystem.emit('plugin:registered', { pluginId: plugin.id });

      return true;

    } catch (error) {
      console.error(`Failed to register plugin ${plugin.id}:`, error.message);
      return false;
    }
  }

  /**
   * Unregister a plugin
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<boolean>} Success status
   */
  async unregister(pluginId) {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      // Deactivate if active
      if (this.activePlugins.has(pluginId)) {
        await this.deactivate(pluginId);
      }

      // Uninstall plugin
      if (plugin.uninstall) {
        await plugin.uninstall(this.createPluginContext(plugin));
      }

      // Unregister hooks
      this.unregisterPluginHooks(plugin);

      // Unregister API
      this.unregisterPluginAPI(plugin);

      // Remove from registry
      this.plugins.delete(pluginId);

      this.eventSystem.emit('plugin:unregistered', { pluginId });

      return true;

    } catch (error) {
      console.error(`Failed to unregister plugin ${pluginId}:`, error.message);
      return false;
    }
  }

  /**
   * Activate a plugin
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<boolean>} Success status
   */
  async activate(pluginId) {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      if (this.activePlugins.has(pluginId)) {
        return true; // Already active
      }

      // Activate dependencies first
      if (plugin.dependencies) {
        for (const depId of plugin.dependencies) {
          if (!this.activePlugins.has(depId)) {
            await this.activate(depId);
          }
        }
      }

      // Activate plugin
      if (plugin.activate) {
        await plugin.activate(this.createPluginContext(plugin));
      }

      this.activePlugins.add(pluginId);

      // Update plugin status
      plugin.status = 'active';
      plugin.activatedAt = Date.now();

      this.eventSystem.emit('plugin:activated', { pluginId });

      return true;

    } catch (error) {
      console.error(`Failed to activate plugin ${pluginId}:`, error.message);
      return false;
    }
  }

  /**
   * Deactivate a plugin
   * @param {string} pluginId - Plugin ID
   * @returns {Promise<boolean>} Success status
   */
  async deactivate(pluginId) {
    try {
      const plugin = this.plugins.get(pluginId);
      if (!plugin) {
        throw new Error(`Plugin ${pluginId} not found`);
      }

      if (!this.activePlugins.has(pluginId)) {
        return true; // Already inactive
      }

      // Check for dependent plugins
      const dependentPlugins = this.findDependentPlugins(pluginId);
      if (dependentPlugins.length > 0) {
        throw new Error(`Cannot deactivate ${pluginId}: required by ${dependentPlugins.join(', ')}`);
      }

      // Deactivate plugin
      if (plugin.deactivate) {
        await plugin.deactivate(this.createPluginContext(plugin));
      }

      this.activePlugins.delete(pluginId);

      // Update plugin status
      plugin.status = 'inactive';
      plugin.deactivatedAt = Date.now();

      this.eventSystem.emit('plugin:deactivated', { pluginId });

      return true;

    } catch (error) {
      console.error(`Failed to deactivate plugin ${pluginId}:`, error.message);
      return false;
    }
  }

  /**
   * Load a plugin from source
   * @param {string} source - Plugin source (URL, file path, etc.)
   * @param {string} type - Source type (url, file, npm, etc.)
   * @returns {Promise<Plugin>} Loaded plugin
   */
  async load(source, type = 'auto') {
    const loaderType = type === 'auto' ? this.detectSourceType(source) : type;
    const loader = this.loaders.get(loaderType);

    if (!loader) {
      throw new Error(`No loader available for type: ${loaderType}`);
    }

    return loader(source);
  }

  /**
   * Register a hook
   * @param {string} hookName - Hook name
   * @param {Function} handler - Hook handler
   * @param {Object} options - Hook options
   * @returns {string} Hook ID
   */
  addHook(hookName, handler, options = {}) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    const hookConfig = {
      id: this.generateHookId(),
      handler,
      priority: options.priority || 0,
      pluginId: options.pluginId || 'core',
      condition: options.condition || null,
      metadata: options.metadata || {}
    };

    this.hooks.get(hookName).push(hookConfig);

    // Sort by priority
    this.hooks.get(hookName).sort((a, b) => b.priority - a.priority);

    return hookConfig.id;
  }

  /**
   * Remove a hook
   * @param {string} hookName - Hook name
   * @param {string} hookId - Hook ID
   * @returns {boolean} Success status
   */
  removeHook(hookName, hookId) {
    if (!this.hooks.has(hookName)) {
      return false;
    }

    const hooks = this.hooks.get(hookName);
    const index = hooks.findIndex(h => h.id === hookId);

    if (index >= 0) {
      hooks.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Execute hooks
   * @param {string} hookName - Hook name
   * @param {*} data - Data to pass to hooks
   * @param {Object} context - Hook context
   * @returns {Promise<*>} Modified data
   */
  async executeHooks(hookName, data, context = {}) {
    const hooks = this.hooks.get(hookName) || [];
    let result = data;

    for (const hook of hooks) {
      try {
        // Check condition if present
        if (hook.condition && !hook.condition(data, context)) {
          continue;
        }

        // Execute hook
        const hookResult = await hook.handler(result, context);

        // Update result if hook returns a value
        if (hookResult !== undefined) {
          result = hookResult;
        }

      } catch (error) {
        console.error(`Hook ${hook.id} failed:`, error.message);
      }
    }

    return result;
  }

  /**
   * Register a plugin API
   * @param {string} namespace - API namespace
   * @param {Object} api - API object
   * @param {string} pluginId - Plugin ID
   */
  registerAPI(namespace, api, pluginId) {
    if (this.apis.has(namespace)) {
      throw new Error(`API namespace ${namespace} already exists`);
    }

    this.apis.set(namespace, {
      api,
      pluginId,
      registeredAt: Date.now()
    });
  }

  /**
   * Unregister a plugin API
   * @param {string} namespace - API namespace
   * @returns {boolean} Success status
   */
  unregisterAPI(namespace) {
    return this.apis.delete(namespace);
  }

  /**
   * Get plugin API
   * @param {string} namespace - API namespace
   * @returns {Object|null} API object
   */
  getAPI(namespace) {
    const apiConfig = this.apis.get(namespace);
    return apiConfig ? apiConfig.api : null;
  }

  /**
   * Create plugin context
   * @param {Plugin} plugin - Plugin
   * @returns {Object} Plugin context
   */
  createPluginContext(plugin) {
    return {
      pluginId: plugin.id,
      eventSystem: this.eventSystem,
      pluginManager: this,
      config: plugin.config || {},

      // Plugin utilities
      addHook: (hookName, handler, options = {}) =>
        this.addHook(hookName, handler, { ...options, pluginId: plugin.id }),

      removeHook: (hookName, hookId) =>
        this.removeHook(hookName, hookId),

      executeHooks: (hookName, data, context) =>
        this.executeHooks(hookName, data, context),

      registerAPI: (namespace, api) =>
        this.registerAPI(namespace, api, plugin.id),

      getAPI: (namespace) =>
        this.getAPI(namespace),

      // Event system access
      on: (eventType, handler, options) =>
        this.eventSystem.on(eventType, handler, options),

      emit: (eventType, data, context, options) =>
        this.eventSystem.emit(eventType, data, context, options),

      // Plugin management
      getPlugin: (pluginId) =>
        this.plugins.get(pluginId),

      isActive: (pluginId) =>
        this.activePlugins.has(pluginId),

      // Utilities
      log: (level, message, data) =>
        console[level](`[${plugin.id}] ${message}`, data),

      storage: this.createPluginStorage(plugin.id)
    };
  }

  /**
   * Create plugin storage
   * @param {string} pluginId - Plugin ID
   * @returns {Object} Storage interface
   */
  createPluginStorage(pluginId) {
    const storageKey = `plugin_${pluginId}`;

    return {
      get: (key, defaultValue = null) => {
        try {
          const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
          return data[key] !== undefined ? data[key] : defaultValue;
        } catch {
          return defaultValue;
        }
      },

      set: (key, value) => {
        try {
          const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
          data[key] = value;
          localStorage.setItem(storageKey, JSON.stringify(data));
          return true;
        } catch {
          return false;
        }
      },

      remove: (key) => {
        try {
          const data = JSON.parse(localStorage.getItem(storageKey) || '{}');
          delete data[key];
          localStorage.setItem(storageKey, JSON.stringify(data));
          return true;
        } catch {
          return false;
        }
      },

      clear: () => {
        try {
          localStorage.removeItem(storageKey);
          return true;
        } catch {
          return false;
        }
      }
    };
  }

  /**
   * Validate plugin
   * @param {Plugin} plugin - Plugin to validate
   * @returns {boolean} Valid status
   */
  validatePlugin(plugin) {
    if (!plugin || typeof plugin !== 'object') {
      return false;
    }

    // Required fields
    if (!plugin.id || !plugin.name || !plugin.version) {
      return false;
    }

    // Version format check
    if (!/^\d+\.\d+\.\d+/.test(plugin.version)) {
      return false;
    }

    return true;
  }

  /**
   * Validate dependencies
   * @param {Plugin} plugin - Plugin to validate
   * @returns {boolean} Dependencies valid
   */
  validateDependencies(plugin) {
    if (!plugin.dependencies) {
      return true;
    }

    for (const depId of plugin.dependencies) {
      if (!this.plugins.has(depId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Register plugin hooks
   * @param {Plugin} plugin - Plugin
   */
  registerPluginHooks(plugin) {
    if (!plugin.hooks) return;

    for (const [hookName, hookConfig] of Object.entries(plugin.hooks)) {
      this.addHook(hookName, hookConfig.handler, {
        priority: hookConfig.priority || 0,
        pluginId: plugin.id,
        condition: hookConfig.condition
      });
    }
  }

  /**
   * Unregister plugin hooks
   * @param {Plugin} plugin - Plugin
   */
  unregisterPluginHooks(plugin) {
    for (const [hookName, hooks] of this.hooks) {
      const pluginHooks = hooks.filter(h => h.pluginId === plugin.id);
      for (const hook of pluginHooks) {
        this.removeHook(hookName, hook.id);
      }
    }
  }

  /**
   * Register plugin API
   * @param {Plugin} plugin - Plugin
   */
  registerPluginAPI(plugin) {
    if (!plugin.api) return;

    for (const [namespace, api] of Object.entries(plugin.api)) {
      this.registerAPI(namespace, api, plugin.id);
    }
  }

  /**
   * Unregister plugin API
   * @param {Plugin} plugin - Plugin
   */
  unregisterPluginAPI(plugin) {
    for (const [namespace, apiConfig] of this.apis) {
      if (apiConfig.pluginId === plugin.id) {
        this.unregisterAPI(namespace);
      }
    }
  }

  /**
   * Find dependent plugins
   * @param {string} pluginId - Plugin ID
   * @returns {Array} Dependent plugin IDs
   */
  findDependentPlugins(pluginId) {
    const dependents = [];

    for (const [id, plugin] of this.plugins) {
      if (plugin.dependencies && plugin.dependencies.includes(pluginId)) {
        if (this.activePlugins.has(id)) {
          dependents.push(id);
        }
      }
    }

    return dependents;
  }

  /**
   * Register default loaders
   */
  registerDefaultLoaders() {
    // JavaScript module loader
    this.loaders.set('module', async (source) => {
      const module = await import(source);
      return module.default || module;
    });

    // JSON plugin loader
    this.loaders.set('json', async (source) => {
      const response = await fetch(source);
      return response.json();
    });

    // URL loader
    this.loaders.set('url', async (source) => {
      const response = await fetch(source);
      const text = await response.text();

      // Try to evaluate as JavaScript
      try {
        const func = new Function('module', 'exports', text);
        const module = { exports: {} };
        func(module, module.exports);
        return module.exports;
      } catch {
        // Try to parse as JSON
        return JSON.parse(text);
      }
    });
  }

  /**
   * Setup core hooks
   */
  setupCoreHooks() {
    // Contact calculation hooks
    this.addHook('contact:calculate', async (data, context) => data);
    this.addHook('contact:modify', async (data, context) => data);

    // Ball simulation hooks
    this.addHook('ball:before', async (data, context) => data);
    this.addHook('ball:after', async (data, context) => data);

    // Match progression hooks
    this.addHook('match:start', async (data, context) => data);
    this.addHook('match:end', async (data, context) => data);

    // Player condition hooks
    this.addHook('player:condition:update', async (data, context) => data);

    // Scoring hooks
    this.addHook('score:calculate', async (data, context) => data);
  }

  /**
   * Detect source type
   * @param {string} source - Source string
   * @returns {string} Detected type
   */
  detectSourceType(source) {
    if (source.startsWith('http')) return 'url';
    if (source.endsWith('.json')) return 'json';
    if (source.endsWith('.js')) return 'module';
    return 'module';
  }

  /**
   * Generate hook ID
   * @returns {string} Hook ID
   */
  generateHookId() {
    return `hook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get plugin information
   * @param {string} pluginId - Plugin ID
   * @returns {Object|null} Plugin info
   */
  getPluginInfo(pluginId) {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) return null;

    return {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
      status: plugin.status,
      active: this.activePlugins.has(pluginId),
      registeredAt: plugin.registeredAt,
      activatedAt: plugin.activatedAt
    };
  }

  /**
   * Get all plugins
   * @returns {Array} Plugin list
   */
  getAllPlugins() {
    return Array.from(this.plugins.keys()).map(id => this.getPluginInfo(id));
  }

  /**
   * Get active plugins
   * @returns {Array} Active plugin list
   */
  getActivePlugins() {
    return Array.from(this.activePlugins).map(id => this.getPluginInfo(id));
  }

  /**
   * Get plugin statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      totalPlugins: this.plugins.size,
      activePlugins: this.activePlugins.size,
      totalHooks: Array.from(this.hooks.values()).reduce((sum, hooks) => sum + hooks.length, 0),
      totalAPIs: this.apis.size,
      loaderTypes: Array.from(this.loaders.keys())
    };
  }

  /**
   * Reset plugin manager
   */
  reset() {
    this.plugins.clear();
    this.activePlugins.clear();
    this.hooks.clear();
    this.apis.clear();
    this.dependencies.clear();
  }
}

export default PluginManager;