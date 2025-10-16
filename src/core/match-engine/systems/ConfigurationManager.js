/**
 * @file ConfigurationManager.js
 * @description Centralized configuration management for cricket simulation
 * @module core/match-engine/ConfigurationManager
 */

/**
 * @typedef {Object} SimulationConfig
 * @property {Object} probabilities - All probability calculations
 * @property {Object} modifiers - Game modifiers and multipliers
 * @property {Object} constants - Game constants and thresholds
 * @property {Object} balance - Balance-related configurations
 * @property {Object} gameplay - Gameplay behavior settings
 */

class ConfigurationManager {
  constructor() {
    // Configuration cache
    this.configs = new Map();

    // Configuration schemas for validation
    this.schemas = new Map();

    // Configuration watchers
    this.watchers = new Map();

    // Default configurations
    this.defaults = new Map();

    // Environment-specific overrides
    this.environments = new Map();

    // Configuration state
    this.isLoaded = false;
    this.loadPromise = null;

    // Configuration metadata
    this.metadata = {
      version: '1.0.0',
      lastLoaded: null,
      source: null
    };

    this.registerDefaultSchemas();
  }

  /**
   * Load configuration from multiple sources
   * @param {Object} sources - Configuration sources
   * @returns {Promise<void>}
   */
  async load(sources = {}) {
    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = this._performLoad(sources);
    await this.loadPromise;
    this.loadPromise = null;
  }

  /**
   * Perform the actual configuration loading
   * @param {Object} sources - Configuration sources
   * @private
   */
  async _performLoad(sources) {
    try {
      const defaultSources = {
        simulation: '/src/data/config/simulation-config.json',
        probabilities: '/src/data/config/probability-tables.json',
        modifiers: '/src/data/config/modifiers-config.json',
        balance: '/src/data/config/balance-config.json',
        gameplay: '/src/data/config/gameplay-config.json'
      };

      const configSources = { ...defaultSources, ...sources };

      // Load all configurations
      const loadPromises = Object.entries(configSources).map(async ([key, source]) => {
        try {
          const config = await this.loadConfigFromSource(source);
          this.setConfig(key, config);
          return { key, success: true };
        } catch (error) {
          console.warn(`Failed to load config ${key} from ${source}:`, error.message);
          // Use default if available
          if (this.defaults.has(key)) {
            this.setConfig(key, this.defaults.get(key));
          }
          return { key, success: false, error: error.message };
        }
      });

      const results = await Promise.all(loadPromises);

      // Validate loaded configurations
      this.validateAllConfigs();

      // Apply environment overrides
      this.applyEnvironmentOverrides();

      this.isLoaded = true;
      this.metadata.lastLoaded = Date.now();

      console.log('Configuration loaded successfully:', results);

    } catch (error) {
      console.error('Configuration loading failed:', error);

      // Fall back to defaults
      this.loadDefaults();
      this.isLoaded = true;
    }
  }

  /**
   * Load configuration from a source
   * @param {string} source - Source path or URL
   * @returns {Promise<Object>} Configuration object
   */
  async loadConfigFromSource(source) {
    if (source.startsWith('http')) {
      // Remote configuration
      const response = await fetch(source);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    } else {
      // Local configuration - in a real app, this would use a file loader
      // For now, we'll return the default configurations
      return this.getDefaultConfigForSource(source);
    }
  }

  /**
   * Get default configuration for a source
   * @param {string} source - Source identifier
   * @returns {Object} Default configuration
   */
  getDefaultConfigForSource(source) {
    if (source.includes('simulation-config')) {
      return this.getDefaultSimulationConfig();
    } else if (source.includes('probability-tables')) {
      return this.getDefaultProbabilityConfig();
    } else if (source.includes('modifiers-config')) {
      return this.getDefaultModifiersConfig();
    } else if (source.includes('balance-config')) {
      return this.getDefaultBalanceConfig();
    } else if (source.includes('gameplay-config')) {
      return this.getDefaultGameplayConfig();
    }

    return {};
  }

  /**
   * Set configuration for a namespace
   * @param {string} namespace - Configuration namespace
   * @param {Object} config - Configuration object
   */
  setConfig(namespace, config) {
    // Validate configuration
    if (this.schemas.has(namespace)) {
      const validation = this.validateConfig(namespace, config);
      if (!validation.valid) {
        console.warn(`Configuration validation failed for ${namespace}:`, validation.errors);
        // Use default for invalid config
        config = this.defaults.get(namespace) || {};
      }
    }

    this.configs.set(namespace, this.deepFreeze(config));

    // Notify watchers
    this.notifyWatchers(namespace, config);
  }

  /**
   * Get configuration for a namespace
   * @param {string} namespace - Configuration namespace
   * @param {string} path - Dot-notation path within config
   * @param {*} defaultValue - Default value if path not found
   * @returns {*} Configuration value
   */
  get(namespace, path = null, defaultValue = null) {
    if (!this.isLoaded) {
      console.warn('Configuration not loaded, using defaults');
      return defaultValue;
    }

    const config = this.configs.get(namespace);
    if (!config) {
      return defaultValue;
    }

    if (!path) {
      return config;
    }

    return this.getNestedValue(config, path, defaultValue);
  }

  /**
   * Get nested value using dot notation
   * @param {Object} obj - Object to traverse
   * @param {string} path - Dot-notation path
   * @param {*} defaultValue - Default value
   * @returns {*} Found value or default
   */
  getNestedValue(obj, path, defaultValue = null) {
    const keys = path.split('.');
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return defaultValue;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Set nested value using dot notation
   * @param {string} namespace - Configuration namespace
   * @param {string} path - Dot-notation path
   * @param {*} value - Value to set
   */
  set(namespace, path, value) {
    const config = this.configs.get(namespace) || {};
    const updatedConfig = this.setNestedValue({ ...config }, path, value);
    this.setConfig(namespace, updatedConfig);
  }

  /**
   * Set nested value in object
   * @param {Object} obj - Object to modify
   * @param {string} path - Dot-notation path
   * @param {*} value - Value to set
   * @returns {Object} Modified object
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
    return obj;
  }

  /**
   * Watch for configuration changes
   * @param {string} namespace - Configuration namespace
   * @param {Function} callback - Callback function
   * @returns {string} Watcher ID
   */
  watch(namespace, callback) {
    const watcherId = this.generateWatcherId();

    if (!this.watchers.has(namespace)) {
      this.watchers.set(namespace, new Map());
    }

    this.watchers.get(namespace).set(watcherId, callback);

    return watcherId;
  }

  /**
   * Remove configuration watcher
   * @param {string} namespace - Configuration namespace
   * @param {string} watcherId - Watcher ID
   * @returns {boolean} Success status
   */
  unwatch(namespace, watcherId) {
    const namespaceWatchers = this.watchers.get(namespace);
    if (namespaceWatchers) {
      return namespaceWatchers.delete(watcherId);
    }
    return false;
  }

  /**
   * Notify watchers of configuration changes
   * @param {string} namespace - Configuration namespace
   * @param {Object} config - New configuration
   */
  notifyWatchers(namespace, config) {
    const namespaceWatchers = this.watchers.get(namespace);
    if (namespaceWatchers) {
      for (const [watcherId, callback] of namespaceWatchers) {
        try {
          callback(config, namespace);
        } catch (error) {
          console.error(`Watcher ${watcherId} failed:`, error);
        }
      }
    }
  }

  /**
   * Validate configuration against schema
   * @param {string} namespace - Configuration namespace
   * @param {Object} config - Configuration to validate
   * @returns {Object} Validation result
   */
  validateConfig(namespace, config) {
    const schema = this.schemas.get(namespace);
    if (!schema) {
      return { valid: true, errors: [] };
    }

    return schema(config);
  }

  /**
   * Validate all loaded configurations
   */
  validateAllConfigs() {
    for (const [namespace, config] of this.configs) {
      const validation = this.validateConfig(namespace, config);
      if (!validation.valid) {
        console.warn(`Configuration ${namespace} validation failed:`, validation.errors);
      }
    }
  }

  /**
   * Register default schemas
   */
  registerDefaultSchemas() {
    // Probability configuration schema
    this.schemas.set('probabilities', (config) => {
      const errors = [];

      // Check required sections
      const requiredSections = ['contact', 'shotTypes', 'trajectories', 'fielding', 'dismissals'];
      for (const section of requiredSections) {
        if (!config[section]) {
          errors.push(`Missing required section: ${section}`);
        }
      }

      // Validate probability ranges
      const validateProbabilities = (obj, path = '') => {
        for (const [key, value] of Object.entries(obj)) {
          const currentPath = path ? `${path}.${key}` : key;

          if (typeof value === 'number') {
            if (value < 0 || value > 1) {
              errors.push(`Probability ${currentPath} must be between 0 and 1, got ${value}`);
            }
          } else if (typeof value === 'object' && value !== null) {
            validateProbabilities(value, currentPath);
          }
        }
      };

      if (config.contact) validateProbabilities(config.contact, 'contact');

      return { valid: errors.length === 0, errors };
    });

    // Modifiers configuration schema
    this.schemas.set('modifiers', (config) => {
      const errors = [];

      // Check for required modifier sections
      const requiredSections = ['pressure', 'fatigue', 'weather', 'pitch', 'phase'];
      for (const section of requiredSections) {
        if (!config[section]) {
          errors.push(`Missing modifier section: ${section}`);
        }
      }

      return { valid: errors.length === 0, errors };
    });
  }

  /**
   * Apply environment-specific overrides
   */
  applyEnvironmentOverrides() {
    const environment = process.env.NODE_ENV || 'development';
    const overrides = this.environments.get(environment);

    if (overrides) {
      for (const [namespace, envConfig] of Object.entries(overrides)) {
        const currentConfig = this.configs.get(namespace) || {};
        const mergedConfig = this.deepMerge(currentConfig, envConfig);
        this.setConfig(namespace, mergedConfig);
      }
    }
  }

  /**
   * Load default configurations
   */
  loadDefaults() {
    for (const [namespace, defaultConfig] of this.defaults) {
      this.setConfig(namespace, defaultConfig);
    }
  }

  /**
   * Deep merge two objects
   * @param {Object} target - Target object
   * @param {Object} source - Source object
   * @returns {Object} Merged object
   */
  deepMerge(target, source) {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * Deep freeze an object
   * @param {Object} obj - Object to freeze
   * @returns {Object} Frozen object
   */
  deepFreeze(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    Object.freeze(obj);

    for (const value of Object.values(obj)) {
      this.deepFreeze(value);
    }

    return obj;
  }

  /**
   * Generate unique watcher ID
   * @returns {string} Watcher ID
   */
  generateWatcherId() {
    return `watcher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get default simulation configuration
   * @returns {Object} Default simulation config
   */
  getDefaultSimulationConfig() {
    return {
      version: "1.0.0",
      match: {
        overs: 20,
        maxWickets: 10,
        powerplayOvers: 6,
        maxBowlerOvers: 4
      },
      timing: {
        ballDelay: {
          normal: 1000,
          fast: 200,
          instant: 0
        }
      },
      features: {
        enableWeather: true,
        enablePitchConditions: true,
        enableFatigue: true,
        enableMorale: true,
        enableInjuries: false
      }
    };
  }

  /**
   * Get default probability configuration
   * @returns {Object} Default probability config
   */
  getDefaultProbabilityConfig() {
    return {
      version: "1.0.0",
      contact: {
        base: {
          missed: 0.15,
          edged: 0.12,
          middled: 0.73
        },
        skillFactors: {
          missed: 0.15,
          edged: 0.10
        },
        minimums: {
          missed: 0.05,
          edged: 0.08
        }
      },
      shotTypes: {
        base: {
          mishit: 0.25,
          goodHit: 0.55,
          smashed: 0.20
        },
        skillFactors: {
          mishit: 0.4,
          smashed: 0.6
        },
        situationFactors: {
          powerplay: {
            aggressive: 1.2,
            risky: 1.1
          },
          death: {
            aggressive: 1.5,
            risky: 1.3
          }
        }
      },
      trajectories: {
        mishit: {
          aerial: 0.30,
          powerFactor: 0.20
        },
        goodHit: {
          aerial: 0.40,
          powerFactor: 0.30
        },
        smashed: {
          aerial: 0.60,
          powerFactor: 0.30
        }
      },
      fielding: {
        mishit: {
          clean: 0.70,
          misfield: 0.25,
          boundary: 0.05
        },
        goodHit: {
          clean: 0.50,
          misfield: 0.35,
          boundary: 0.15
        },
        smashed: {
          clean: 0.30,
          misfield: 0.40,
          boundary: 0.30
        }
      },
      dismissals: {
        missed: {
          bowled: 0.50,
          lbw: 0.35,
          hitWicket: 0.15
        },
        edged: {
          caught: 0.60,
          runs: 0.40
        }
      }
    };
  }

  /**
   * Get default modifiers configuration
   * @returns {Object} Default modifiers config
   */
  getDefaultModifiersConfig() {
    return {
      version: "1.0.0",
      pressure: {
        base: 0.5,
        situational: {
          powerplay: -0.1,
          death: 0.3,
          chase: 0.2,
          lowTarget: -0.2
        },
        impact: {
          contact: 0.3,
          confidence: 0.4
        }
      },
      fatigue: {
        thresholds: {
          minor: 30,
          moderate: 60,
          severe: 80
        },
        impact: {
          minor: 0.05,
          moderate: 0.15,
          severe: 0.30
        }
      },
      weather: {
        overcast: {
          swingBonus: 2,
          visibilityPenalty: 1
        },
        sunny: {
          spinBonus: 1,
          pacePenalty: 1
        },
        humid: {
          fatigueIncrease: 1.2,
          swingBonus: 1
        }
      },
      pitch: {
        dusty: {
          spinBonus: 3,
          paceReduction: 1
        },
        green: {
          seamBonus: 2,
          spinReduction: 1
        },
        flat: {
          battingBonus: 2,
          bowlingPenalty: 1
        }
      },
      phase: {
        powerplay: {
          aggressionBonus: 0.2,
          riskTolerance: 1.2
        },
        middle: {
          buildingPressure: 0.1,
          rotateStrike: 1.3
        },
        death: {
          maximumAggression: 1.5,
          highRisk: 1.4
        }
      }
    };
  }

  /**
   * Get default balance configuration
   * @returns {Object} Default balance config
   */
  getDefaultBalanceConfig() {
    return {
      version: "1.0.0",
      runs: {
        expectedPerOver: {
          powerplay: 8.5,
          middle: 7.0,
          death: 9.5
        },
        boundaries: {
          fourRate: 0.12,
          sixRate: 0.05
        }
      },
      wickets: {
        expectedPerMatch: 15,
        phaseDistribution: {
          powerplay: 0.25,
          middle: 0.45,
          death: 0.30
        }
      },
      attributes: {
        effectiveness: {
          technique: 0.25,
          timing: 0.20,
          power: 0.15,
          placement: 0.15,
          vs_type: 0.25
        }
      }
    };
  }

  /**
   * Get default gameplay configuration
   * @returns {Object} Default gameplay config
   */
  getDefaultGameplayConfig() {
    return {
      version: "1.0.0",
      energy: {
        costs: {
          ballFaced: 0.8,
          ballBowled: 1.2,
          runTaken: 1.5,
          fieldingAction: 0.5,
          wicketKeeping: 0.3
        },
        recovery: {
          betweenOvers: 2.0,
          betweenMatches: 50.0
        }
      },
      confidence: {
        changes: {
          boundary: 3,
          six: 5,
          fifty: 8,
          hundred: 15,
          wicket: -8,
          goldenDuck: -12,
          maiden: 2,
          hitForSix: -3,
          catch: 3,
          droppedCatch: -4
        },
        decay: {
          perBall: 0.1,
          perOver: 0.5
        }
      },
      morale: {
        teamImpact: {
          partnership: 2,
          collapse: -5,
          victory: 10,
          defeat: -8
        }
      }
    };
  }

  /**
   * Export current configuration
   * @returns {Object} Complete configuration
   */
  export() {
    const exported = {};
    for (const [namespace, config] of this.configs) {
      exported[namespace] = config;
    }
    return exported;
  }

  /**
   * Import configuration
   * @param {Object} configData - Configuration data to import
   */
  import(configData) {
    for (const [namespace, config] of Object.entries(configData)) {
      this.setConfig(namespace, config);
    }
  }

  /**
   * Reset to defaults
   */
  reset() {
    this.configs.clear();
    this.loadDefaults();
  }

  /**
   * Get configuration metadata
   * @returns {Object} Metadata
   */
  getMetadata() {
    return { ...this.metadata };
  }
}

export default ConfigurationManager;