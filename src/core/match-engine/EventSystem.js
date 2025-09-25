/**
 * @file EventSystem.js
 * @description Extensible event system for cricket match simulation
 * @module core/match-engine/EventSystem
 */

/**
 * @typedef {Object} Event
 * @property {string} type - Event type
 * @property {string} id - Unique event ID
 * @property {number} timestamp - Event timestamp
 * @property {Object} data - Event data
 * @property {Object} context - Event context (match, players, etc.)
 * @property {string} source - Event source (system, plugin, user)
 * @property {number} priority - Event priority (0-100, higher = more important)
 */

/**
 * @typedef {Object} EventHandler
 * @property {Function} handler - Handler function
 * @property {number} priority - Handler priority
 * @property {boolean} once - Whether to run only once
 * @property {string} id - Handler ID
 */

class EventSystem {
  constructor() {
    // Event handlers registry
    this.handlers = new Map();

    // Event middleware pipeline
    this.middleware = [];

    // Event queue for deferred processing
    this.eventQueue = [];

    // Event history for debugging/analysis
    this.eventHistory = [];

    // Event filters
    this.filters = new Map();

    // Event transformers
    this.transformers = new Map();

    // Conditional handlers
    this.conditionalHandlers = new Map();

    // Event aggregators
    this.aggregators = new Map();

    // Configuration
    this.config = {
      maxHistorySize: 1000,
      enableHistory: true,
      enableMiddleware: true,
      enableFilters: true,
      enableTransformers: true,
      enableAggregation: true,
      queueProcessing: false
    };
  }

  /**
   * Register an event handler
   * @param {string} eventType - Event type or pattern
   * @param {Function} handler - Handler function
   * @param {Object} options - Handler options
   * @returns {string} Handler ID
   */
  on(eventType, handler, options = {}) {
    const handlerConfig = {
      handler,
      priority: options.priority || 0,
      once: options.once || false,
      id: options.id || this.generateHandlerId(),
      condition: options.condition || null,
      metadata: options.metadata || {}
    };

    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    this.handlers.get(eventType).push(handlerConfig);

    // Sort by priority (higher priority first)
    this.handlers.get(eventType).sort((a, b) => b.priority - a.priority);

    return handlerConfig.id;
  }

  /**
   * Register a one-time event handler
   * @param {string} eventType - Event type
   * @param {Function} handler - Handler function
   * @param {Object} options - Handler options
   * @returns {string} Handler ID
   */
  once(eventType, handler, options = {}) {
    return this.on(eventType, handler, { ...options, once: true });
  }

  /**
   * Register a conditional event handler
   * @param {string} eventType - Event type
   * @param {Function} condition - Condition function
   * @param {Function} handler - Handler function
   * @param {Object} options - Handler options
   * @returns {string} Handler ID
   */
  when(eventType, condition, handler, options = {}) {
    return this.on(eventType, handler, { ...options, condition });
  }

  /**
   * Remove an event handler
   * @param {string} eventType - Event type
   * @param {string} handlerId - Handler ID
   * @returns {boolean} Whether handler was removed
   */
  off(eventType, handlerId) {
    if (!this.handlers.has(eventType)) {
      return false;
    }

    const handlers = this.handlers.get(eventType);
    const index = handlers.findIndex(h => h.id === handlerId);

    if (index >= 0) {
      handlers.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Emit an event
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @param {Object} context - Event context
   * @param {Object} options - Emit options
   * @returns {Promise<Object>} Event result
   */
  async emit(eventType, data = {}, context = {}, options = {}) {
    const event = this.createEvent(eventType, data, context, options);

    if (this.config.queueProcessing && options.queued !== false) {
      this.eventQueue.push(event);
      return { queued: true, eventId: event.id };
    }

    return this.processEvent(event);
  }

  /**
   * Emit multiple events in sequence
   * @param {Array} events - Array of event specifications
   * @param {Object} context - Shared context
   * @returns {Promise<Array>} Array of event results
   */
  async emitSequence(events, context = {}) {
    const results = [];

    for (const eventSpec of events) {
      const result = await this.emit(
        eventSpec.type,
        eventSpec.data || {},
        { ...context, ...eventSpec.context },
        eventSpec.options || {}
      );

      results.push(result);

      // Allow sequence to be interrupted
      if (result.stopSequence) {
        break;
      }
    }

    return results;
  }

  /**
   * Emit multiple events in parallel
   * @param {Array} events - Array of event specifications
   * @param {Object} context - Shared context
   * @returns {Promise<Array>} Array of event results
   */
  async emitParallel(events, context = {}) {
    const promises = events.map(eventSpec =>
      this.emit(
        eventSpec.type,
        eventSpec.data || {},
        { ...context, ...eventSpec.context },
        eventSpec.options || {}
      )
    );

    return Promise.all(promises);
  }

  /**
   * Process queued events
   * @returns {Promise<Array>} Array of processed event results
   */
  async processQueue() {
    const results = [];

    while (this.eventQueue.length > 0) {
      const event = this.eventQueue.shift();
      const result = await this.processEvent(event);
      results.push(result);
    }

    return results;
  }

  /**
   * Create an event object
   * @param {string} eventType - Event type
   * @param {Object} data - Event data
   * @param {Object} context - Event context
   * @param {Object} options - Event options
   * @returns {Event} Created event
   */
  createEvent(eventType, data, context, options) {
    return {
      type: eventType,
      id: this.generateEventId(),
      timestamp: Date.now(),
      data: { ...data },
      context: { ...context },
      source: options.source || 'system',
      priority: options.priority || 50,
      metadata: options.metadata || {},
      version: options.version || '1.0.0'
    };
  }

  /**
   * Process a single event
   * @param {Event} event - Event to process
   * @returns {Promise<Object>} Event result
   */
  async processEvent(event) {
    try {
      // Apply middleware
      if (this.config.enableMiddleware) {
        event = await this.applyMiddleware(event);
      }

      // Apply filters
      if (this.config.enableFilters && !this.passesFilters(event)) {
        return { filtered: true, eventId: event.id };
      }

      // Apply transformers
      if (this.config.enableTransformers) {
        event = await this.applyTransformers(event);
      }

      // Find and execute handlers
      const handlerResults = await this.executeHandlers(event);

      // Apply aggregators
      if (this.config.enableAggregation) {
        await this.applyAggregators(event, handlerResults);
      }

      // Store in history
      if (this.config.enableHistory) {
        this.addToHistory(event, handlerResults);
      }

      return {
        success: true,
        eventId: event.id,
        handlerResults,
        processedAt: Date.now()
      };

    } catch (error) {
      return {
        success: false,
        eventId: event.id,
        error: error.message,
        processedAt: Date.now()
      };
    }
  }

  /**
   * Execute handlers for an event
   * @param {Event} event - Event to handle
   * @returns {Promise<Array>} Handler results
   */
  async executeHandlers(event) {
    const results = [];

    // Direct handlers
    const directHandlers = this.handlers.get(event.type) || [];

    // Pattern-based handlers
    const patternHandlers = this.findPatternHandlers(event.type);

    // Wildcard handlers
    const wildcardHandlers = this.handlers.get('*') || [];

    const allHandlers = [...directHandlers, ...patternHandlers, ...wildcardHandlers];

    for (const handlerConfig of allHandlers) {
      try {
        // Check condition if present
        if (handlerConfig.condition && !handlerConfig.condition(event)) {
          continue;
        }

        // Execute handler
        const result = await handlerConfig.handler(event);

        results.push({
          handlerId: handlerConfig.id,
          result,
          executedAt: Date.now()
        });

        // Remove one-time handlers
        if (handlerConfig.once) {
          this.off(event.type, handlerConfig.id);
        }

        // Check if processing should stop
        if (result && result.stopPropagation) {
          break;
        }

      } catch (error) {
        results.push({
          handlerId: handlerConfig.id,
          error: error.message,
          executedAt: Date.now()
        });
      }
    }

    return results;
  }

  /**
   * Add middleware to the pipeline
   * @param {Function} middleware - Middleware function
   * @param {number} priority - Middleware priority
   */
  addMiddleware(middleware, priority = 0) {
    this.middleware.push({ fn: middleware, priority });
    this.middleware.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Apply middleware pipeline
   * @param {Event} event - Event to process
   * @returns {Promise<Event>} Processed event
   */
  async applyMiddleware(event) {
    let processedEvent = { ...event };

    for (const middleware of this.middleware) {
      processedEvent = await middleware.fn(processedEvent);
    }

    return processedEvent;
  }

  /**
   * Add an event filter
   * @param {string} name - Filter name
   * @param {Function} filter - Filter function
   */
  addFilter(name, filter) {
    this.filters.set(name, filter);
  }

  /**
   * Check if event passes all filters
   * @param {Event} event - Event to check
   * @returns {boolean} Whether event passes filters
   */
  passesFilters(event) {
    for (const [name, filter] of this.filters) {
      if (!filter(event)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Add an event transformer
   * @param {string} name - Transformer name
   * @param {Function} transformer - Transformer function
   */
  addTransformer(name, transformer) {
    this.transformers.set(name, transformer);
  }

  /**
   * Apply transformers to event
   * @param {Event} event - Event to transform
   * @returns {Promise<Event>} Transformed event
   */
  async applyTransformers(event) {
    let transformedEvent = { ...event };

    for (const [name, transformer] of this.transformers) {
      transformedEvent = await transformer(transformedEvent);
    }

    return transformedEvent;
  }

  /**
   * Add an event aggregator
   * @param {string} name - Aggregator name
   * @param {Function} aggregator - Aggregator function
   */
  addAggregator(name, aggregator) {
    this.aggregators.set(name, aggregator);
  }

  /**
   * Apply aggregators to collect event data
   * @param {Event} event - Processed event
   * @param {Array} handlerResults - Handler results
   */
  async applyAggregators(event, handlerResults) {
    for (const [name, aggregator] of this.aggregators) {
      try {
        await aggregator(event, handlerResults);
      } catch (error) {
        console.warn(`Aggregator ${name} failed:`, error.message);
      }
    }
  }

  /**
   * Find pattern-based handlers
   * @param {string} eventType - Event type
   * @returns {Array} Matching handlers
   */
  findPatternHandlers(eventType) {
    const patternHandlers = [];

    for (const [pattern, handlers] of this.handlers) {
      if (pattern.includes('*') || pattern.includes('?')) {
        const regex = this.patternToRegex(pattern);
        if (regex.test(eventType)) {
          patternHandlers.push(...handlers);
        }
      }
    }

    return patternHandlers;
  }

  /**
   * Convert pattern to regex
   * @param {string} pattern - Pattern string
   * @returns {RegExp} Regex pattern
   */
  patternToRegex(pattern) {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const withWildcards = escaped.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
    return new RegExp(`^${withWildcards}$`);
  }

  /**
   * Add event to history
   * @param {Event} event - Processed event
   * @param {Array} handlerResults - Handler results
   */
  addToHistory(event, handlerResults) {
    this.eventHistory.push({
      event,
      handlerResults,
      processedAt: Date.now()
    });

    // Trim history if needed
    if (this.eventHistory.length > this.config.maxHistorySize) {
      this.eventHistory.shift();
    }
  }

  /**
   * Generate unique event ID
   * @returns {string} Event ID
   */
  generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique handler ID
   * @returns {string} Handler ID
   */
  generateHandlerId() {
    return `hnd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get event statistics
   * @returns {Object} Event statistics
   */
  getStats() {
    const eventTypes = {};
    this.eventHistory.forEach(entry => {
      const type = entry.event.type;
      eventTypes[type] = (eventTypes[type] || 0) + 1;
    });

    return {
      totalEvents: this.eventHistory.length,
      eventTypes,
      queueSize: this.eventQueue.length,
      handlerCount: Array.from(this.handlers.values()).reduce((sum, handlers) => sum + handlers.length, 0),
      middlewareCount: this.middleware.length,
      filterCount: this.filters.size,
      transformerCount: this.transformers.size,
      aggregatorCount: this.aggregators.size
    };
  }

  /**
   * Clear event history
   */
  clearHistory() {
    this.eventHistory = [];
  }

  /**
   * Clear event queue
   */
  clearQueue() {
    this.eventQueue = [];
  }

  /**
   * Get events by type from history
   * @param {string} eventType - Event type
   * @returns {Array} Matching events
   */
  getEventsByType(eventType) {
    return this.eventHistory
      .filter(entry => entry.event.type === eventType)
      .map(entry => entry.event);
  }

  /**
   * Get events by criteria from history
   * @param {Function} criteria - Criteria function
   * @returns {Array} Matching events
   */
  getEventsByCriteria(criteria) {
    return this.eventHistory
      .filter(entry => criteria(entry.event))
      .map(entry => entry.event);
  }

  /**
   * Create event namespace
   * @param {string} namespace - Namespace name
   * @returns {Object} Namespaced event system
   */
  namespace(namespace) {
    return {
      on: (eventType, handler, options) =>
        this.on(`${namespace}:${eventType}`, handler, options),

      once: (eventType, handler, options) =>
        this.once(`${namespace}:${eventType}`, handler, options),

      when: (eventType, condition, handler, options) =>
        this.when(`${namespace}:${eventType}`, condition, handler, options),

      off: (eventType, handlerId) =>
        this.off(`${namespace}:${eventType}`, handlerId),

      emit: (eventType, data, context, options) =>
        this.emit(`${namespace}:${eventType}`, data, context, options)
    };
  }

  /**
   * Update configuration
   * @param {Object} newConfig - New configuration
   */
  configure(newConfig) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Reset the event system
   */
  reset() {
    this.handlers.clear();
    this.middleware = [];
    this.eventQueue = [];
    this.eventHistory = [];
    this.filters.clear();
    this.transformers.clear();
    this.conditionalHandlers.clear();
    this.aggregators.clear();
  }
}

export default EventSystem;