/**
 * @file EnergyManager.js
 * @description Manage player energy system with depletion, recovery, fatigue, and injuries
 * @module core/tactics/EnergyManager
 */

import energyConfig from '../../data/config/energy-config.json';

/**
 * @class EnergyManager
 * @description Manages energy depletion and recovery during and after matches
 */
class EnergyManager {
  constructor() {
    this.levels = energyConfig.energyLevels;
    this.depletionRates = energyConfig.depletionRates;
    this.limits = energyConfig.limits;
    this.fatigueInjuryRules = energyConfig.fatigueAndInjury;
  }

  /**
   * Initialize match energy for all players (energy = fitness)
   * @param {Object[]} players - Array of player objects
   * @returns {Object} Player energy map {playerId: energy}
   */
  initializeMatchEnergy(players) {
    const energyMap = {};

    players.forEach(player => {
      const playerId = typeof player === 'string' ? player : player.id;
      const playerObj = typeof player === 'string' ? null : player;

      // energy = fitness (default 100 if not set)
      const fitness = playerObj?.condition?.fitness ?? 100;
      energyMap[playerId] = this.clampEnergy(fitness);
    });

    return energyMap;
  }

  /**
   * Update batting energy after ball faced
   * @param {Object} player - Player object
   * @param {number} ballsFaced - Number of balls faced
   * @param {number} runsTaken - Number of runs taken
   * @returns {number} Updated energy value
   */
  updateBattingEnergy(player, ballsFaced, runsTaken) {
    let currentEnergy = player.condition?.energy ?? 100;
    const stamina = player.attributes?.physical?.stamina;

    // Depletion for balls faced
    const ballDepletion = this.calculateStaminaScaledDepletion(
      this.depletionRates.batting.perBallFaced.base,
      stamina
    );

    // Depletion for runs taken
    const runDepletion = this.calculateStaminaScaledDepletion(
      this.depletionRates.batting.perRunTaken.base,
      stamina
    );

    const totalDepletion = (ballDepletion * ballsFaced) + (runDepletion * runsTaken);
    const newEnergy = this.clampEnergy(currentEnergy + totalDepletion);

    return newEnergy;
  }

  /**
   * Update bowling energy based on over number
   * @param {Object} bowler - Bowler object
   * @param {number} overNumber - Which over (1-4)
   * @param {number} ballsBowled - Number of balls bowled this call
   * @returns {number} Updated energy value
   */
  updateBowlingEnergy(bowler, overNumber, ballsBowled) {
    let currentEnergy = bowler.condition?.energy ?? 100;
    const stamina = bowler.attributes?.physical?.stamina;

    // Determine base depletion rate based on over number
    let baseDepletionRate;
    if (overNumber === 1) {
      baseDepletionRate = this.depletionRates.bowling.over1.perBall;
    } else if (overNumber === 2) {
      baseDepletionRate = this.depletionRates.bowling.over2.perBall;
    } else if (overNumber === 3) {
      baseDepletionRate = this.depletionRates.bowling.over3.perBall;
    } else {
      // Over 4+
      baseDepletionRate = this.depletionRates.bowling.over4.perBall;
    }

    const scaledDepletion = this.calculateStaminaScaledDepletion(baseDepletionRate, stamina);
    const totalDepletion = scaledDepletion * ballsBowled;
    const newEnergy = this.clampEnergy(currentEnergy + totalDepletion);

    return newEnergy;
  }

  /**
   * Update fielding energy after action
   * @param {Object} fielder - Fielder object
   * @param {string} action - 'field' or 'catch'
   * @returns {number} Updated energy value
   */
  updateFieldingEnergy(fielder, action) {
    let currentEnergy = fielder.condition?.energy ?? 100;
    const stamina = fielder.attributes?.physical?.stamina;

    let baseDepletion;
    if (action === 'catch') {
      baseDepletion = this.depletionRates.fielding.perCatchAttempt.base;
    } else {
      baseDepletion = this.depletionRates.fielding.perBallFielded.base;
    }

    const scaledDepletion = this.calculateStaminaScaledDepletion(baseDepletion, stamina);
    const newEnergy = this.clampEnergy(currentEnergy + scaledDepletion);

    return newEnergy;
  }

  /**
   * Calculate stamina-scaled depletion
   * @param {number} baseDepletion - Base depletion amount (negative)
   * @param {number} stamina - Stamina attribute (1-20)
   * @returns {number} Scaled depletion (negative)
   */
  calculateStaminaScaledDepletion(baseDepletion, stamina) {
    // Formula: actualDepletion = baseDepletion × (1 - 0.01 × stamina)
    const scalingFactor = 1 - (0.01 * stamina);
    return baseDepletion * scalingFactor;
  }

  /**
   * Get energy level name from energy value
   * @param {number} energy - Energy value (0-100)
   * @returns {string} Level name
   */
  getEnergyLevel(energy) {
    for (const [levelName, levelData] of Object.entries(this.levels)) {
      if (energy >= levelData.range[0] && energy <= levelData.range[1]) {
        return levelName;
      }
    }
    return 'Fresh'; // Fallback
  }

  /**
   * Apply energy penalties to player attributes
   * @param {Object} player - Player object
   * @param {number} energy - Current energy value
   * @returns {Object} Modified player (copy)
   */
  applyEnergyModifiers(player, energy) {
    const levelName = this.getEnergyLevel(energy);
    const levelData = this.levels[levelName];
    const penalties = levelData.penalties;

    if (!penalties || Object.keys(penalties).length === 0) {
      return player; // No penalties for Fresh
    }

    // Deep clone player to avoid mutating original (must clone nested attribute objects)
    const modifiedPlayer = {
      ...player,
      attributes: {
        ...player.attributes,
        batting: { ...player.attributes?.batting },
        bowling: { ...player.attributes?.bowling },
        physical: { ...player.attributes?.physical },
        mental: { ...player.attributes?.mental },
        fielding: { ...player.attributes?.fielding }
      },
      condition: { ...player.condition }
    };

    // Check for allAttributes penalty
    if (penalties.allAttributes !== undefined) {
      this.applyModifierToAllAttributes(modifiedPlayer, penalties.allAttributes);
    } else {
      // Apply specific attribute penalties
      Object.entries(penalties).forEach(([attr, penalty]) => {
        this.applyAttributeModifier(modifiedPlayer, attr, penalty);
      });
    }

    return modifiedPlayer;
  }

  /**
   * Apply modifier to specific attribute
   * @param {Object} player - Player object (will be mutated)
   * @param {string} attributeName - Attribute name
   * @param {number} modifier - Modifier value
   */
  applyAttributeModifier(player, attributeName, modifier) {
    // Search in physical attributes (most common for energy penalties)
    if (player.attributes?.physical && player.attributes.physical[attributeName] !== undefined) {
      player.attributes.physical[attributeName] += modifier;
      return;
    }

    // Search in other categories
    if (player.attributes?.batting && player.attributes.batting[attributeName] !== undefined) {
      player.attributes.batting[attributeName] += modifier;
      return;
    }

    if (player.attributes?.bowling && player.attributes.bowling[attributeName] !== undefined) {
      player.attributes.bowling[attributeName] += modifier;
      return;
    }

    if (player.attributes?.mental && player.attributes.mental[attributeName] !== undefined) {
      player.attributes.mental[attributeName] += modifier;
      return;
    }

    if (player.attributes?.fielding && player.attributes.fielding[attributeName] !== undefined) {
      player.attributes.fielding[attributeName] += modifier;
      return;
    }

    console.warn(`Energy penalty attribute ${attributeName} not found for ${player.name}`);
  }

  /**
   * Apply modifier to all attributes across all categories
   * @param {Object} player - Player object (will be mutated)
   * @param {number} modifier - Modifier value
   */
  applyModifierToAllAttributes(player, modifier) {
    if (!player.attributes) return;

    // Apply to all categories
    ['batting', 'bowling', 'physical', 'mental', 'fielding'].forEach(category => {
      if (player.attributes[category]) {
        Object.keys(player.attributes[category]).forEach(attr => {
          player.attributes[category][attr] += modifier;
        });
      }
    });
  }

  /**
   * Finalize match energy - update fitness, fatigue, and check injuries
   * @param {Object[]} players - Array of player objects
   * @returns {Object} Updates map {playerId: {fitness, fatigue, injury}}
   */
  finalizeMatchEnergy(players) {
    const updates = {};

    players.forEach(player => {
      const playerId = typeof player === 'string' ? player : player.id;
      const playerObj = typeof player === 'string' ? null : player;

      if (!playerObj) return;

      const finalEnergy = playerObj.condition?.energy ?? 100;
      const currentFatigue = playerObj.condition?.fatigue ?? 0;

      // Update fitness = energy
      const newFitness = this.clampEnergy(finalEnergy);

      // Calculate fatigue increase probability
      const energyDepleted = 100 - finalEnergy;
      const fatigueIncreaseProbability = energyDepleted / 100;

      let newFatigue = currentFatigue;
      if (Math.random() < fatigueIncreaseProbability) {
        newFatigue = this.clampFatigue(currentFatigue + this.fatigueInjuryRules.fatigueIncrease.change);
      }

      // Check for injury based on fatigue
      let injuryDuration = null;
      const injuryProbability = newFatigue / 100;
      if (Math.random() < injuryProbability) {
        // Trigger injury with inverse linear probability (shorter injuries more likely)
        const minDuration = this.fatigueInjuryRules.injuryTrigger.duration.min;
        const maxDuration = this.fatigueInjuryRules.injuryTrigger.duration.max;

        // Calculate weights: shorter durations get higher weights
        // For duration d: weight = (maxDuration - d + 1)
        // This creates inverse linear scaling where probability decreases with duration
        const weights = [];
        const durations = [];
        let totalWeight = 0;

        for (let d = minDuration; d <= maxDuration; d++) {
          const weight = (maxDuration - d + 1);
          weights.push(weight);
          durations.push(d);
          totalWeight += weight;
        }

        // Weighted random selection
        let random = Math.random() * totalWeight;
        for (let i = 0; i < durations.length; i++) {
          random -= weights[i];
          if (random <= 0) {
            injuryDuration = durations[i];
            break;
          }
        }

        // Fallback to minimum duration if something goes wrong
        if (!injuryDuration) {
          injuryDuration = minDuration;
        }
      }

      updates[playerId] = {
        fitness: newFitness,
        fatigue: newFatigue,
        injuryDuration
      };
    });

    return updates;
  }

  /**
   * Clamp energy value to valid range (0-100)
   * @param {number} energy - Energy value
   * @returns {number} Clamped energy
   */
  clampEnergy(energy) {
    return Math.max(this.limits.energyMin, Math.min(this.limits.energyMax, energy));
  }

  /**
   * Clamp fatigue value to valid range (0-100)
   * @param {number} fatigue - Fatigue value
   * @returns {number} Clamped fatigue
   */
  clampFatigue(fatigue) {
    return Math.max(this.limits.fatigueMin, Math.min(this.limits.fatigueMax, fatigue));
  }

  /**
   * Get info about manager
   * @returns {Object} Manager info
   */
  getInfo() {
    return {
      name: 'EnergyManager',
      version: '1.0.0',
      levels: Object.keys(this.levels),
      limits: this.limits,
      staminaScaling: this.depletionRates.staminaScaling.formula,
      description: 'Manages energy depletion with stamina scaling, fatigue, and injuries',
      methods: [
        'initializeMatchEnergy(players)',
        'updateBattingEnergy(player, ballsFaced, runsTaken)',
        'updateBowlingEnergy(bowler, overNumber, ballsBowled)',
        'updateFieldingEnergy(fielder, action)',
        'getEnergyLevel(energy)',
        'applyEnergyModifiers(player, energy)',
        'finalizeMatchEnergy(players)'
      ]
    };
  }
}

// Export singleton instance
export default new EnergyManager();
