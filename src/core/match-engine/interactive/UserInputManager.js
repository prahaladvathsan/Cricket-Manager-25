/**
 * @file UserInputManager.js
 * @description Enhanced user input handling with validation and menu helpers
 * Consolidates input logic and provides reusable prompting methods
 */

import { ACCELERATION_TIERS, getBowlingPlanOptions } from './InteractiveMatchConstants.js';

class UserInputManager {
  constructor(inputHandler) {
    this.inputHandler = inputHandler;
  }

  /**
   * Ask a simple question and return the answer
   * @param {string} prompt - Question to ask
   * @returns {Promise<string>} User's answer (trimmed)
   */
  async ask(prompt) {
    return this.inputHandler.question(prompt);
  }

  /**
   * Ask for a choice from a numbered menu
   * @param {string} prompt - Question to ask
   * @param {number} min - Minimum valid number
   * @param {number} max - Maximum valid number
   * @param {string} defaultValue - Default if user presses Enter (optional)
   * @returns {Promise<string>} User's choice
   */
  async askChoice(prompt, min, max, defaultValue = null) {
    const answer = await this.inputHandler.question(prompt);

    if (!answer && defaultValue !== null) {
      return defaultValue;
    }

    const choice = parseInt(answer);
    if (isNaN(choice) || choice < min || choice > max) {
      return defaultValue || min.toString();
    }

    return answer;
  }

  /**
   * Ask for player selection from a list
   * @param {string} prompt - Question to ask
   * @param {number} maxPlayers - Maximum number of players
   * @param {boolean} allowEmpty - Allow Enter for default
   * @returns {Promise<number>} Selected player index (0-based) or -1 for auto
   */
  async askPlayerSelection(prompt, maxPlayers, allowEmpty = true) {
    const answer = await this.inputHandler.question(prompt);

    if (!answer && allowEmpty) {
      return -1; // Auto-select
    }

    const choice = parseInt(answer);
    if (isNaN(choice) || choice < 1 || choice > maxPlayers) {
      return -1; // Auto-select on invalid
    }

    return choice - 1; // Return 0-based index
  }

  /**
   * Ask for comma-separated player selections
   * @param {string} prompt - Question to ask
   * @param {number} maxPlayers - Maximum number of players
   * @returns {Promise<number[]>} Array of selected indices (0-based), empty for 'done'
   */
  async askMultiplePlayerSelection(prompt, maxPlayers) {
    const answer = await this.inputHandler.question(prompt);

    if (answer.toLowerCase() === 'done') {
      return null; // Signal completion
    }

    // Parse comma-separated numbers
    const choices = answer.split(',').map(s => s.trim()).filter(s => s);
    const indices = [];

    for (const choice of choices) {
      const idx = parseInt(choice) - 1;
      if (!isNaN(idx) && idx >= 0 && idx < maxPlayers) {
        indices.push(idx);
      }
    }

    return indices;
  }

  /**
   * Ask for acceleration tier selection
   * @param {string} playerName - Name of player to set tier for
   * @param {string} currentTier - Current tier setting
   * @returns {Promise<string>} Selected tier name or 'auto'
   */
  async askAccelerationTier(playerName, currentTier) {
    console.log(`\nCurrent: ${playerName}`);
    const answer = await this.inputHandler.question('Acceleration tier (1-7, or Enter for auto): ');

    if (!answer || answer === '7') {
      return currentTier; // Keep current
    }

    const choice = parseInt(answer);
    if (isNaN(choice) || choice < 1 || choice > 6) {
      return currentTier;
    }

    return ACCELERATION_TIERS[choice - 1];
  }

  /**
   * Ask for bowling plan selection
   * @param {Object} bowler - Bowler player object
   * @returns {Promise<Object>} { lineLength, variation }
   */
  async askBowlingPlans(bowler) {
    const isPaceBowler = bowler.bowlingType === 'pace';
    const options = getBowlingPlanOptions(bowler.bowlingType);

    // Display line/length options
    console.log('\nLine/Length Plans:');
    options.lineLength.forEach((plan, i) => {
      console.log(`${i + 1}. ${plan}`);
    });
    console.log('5. Keep default');

    const lineLengthAnswer = await this.inputHandler.question('\nLine/Length (1-5, or Enter for default): ');

    // Display variation options
    console.log('\nVariation Plans:');
    options.variation.forEach((plan, i) => {
      console.log(`${i + 1}. ${plan}`);
    });
    console.log('5. Keep default');

    const variationAnswer = await this.inputHandler.question('\nVariation (1-5, or Enter for default): ');

    // Get defaults
    const defaultPlans = bowler.tactics?.defaultBowlingPlans || {
      lineLength: 'Wide Line',
      variation: 'Consistent Accuracy'
    };

    // Parse choices
    const lineLengthChoice = parseInt(lineLengthAnswer);
    const variationChoice = parseInt(variationAnswer);

    const lineLength = (lineLengthChoice >= 1 && lineLengthChoice <= 4) ?
      options.lineLength[lineLengthChoice - 1] :
      defaultPlans.lineLength;

    const variation = (variationChoice >= 1 && variationChoice <= 4) ?
      options.variation[variationChoice - 1] :
      defaultPlans.variation;

    return { lineLength, variation };
  }

  /**
   * Ask yes/no question
   * @param {string} prompt - Question to ask
   * @returns {Promise<boolean>} True for yes, false for no
   */
  async askYesNo(prompt) {
    const answer = await this.inputHandler.question(prompt);
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  }

  /**
   * Wait for user to press Enter
   * @param {string} prompt - Prompt message (default: 'Press Enter to continue...')
   * @returns {Promise<void>}
   */
  async waitForEnter(prompt = 'Press Enter to continue...') {
    await this.inputHandler.question(`\n${prompt}`);
  }

  /**
   * Get custom value (with optional default)
   * @param {string} prompt - Question to ask
   * @param {string|number} defaultValue - Default value if Enter is pressed
   * @returns {Promise<string>} User's input or default
   */
  async askCustomValue(prompt, defaultValue) {
    const answer = await this.inputHandler.question(prompt);
    return answer || defaultValue.toString();
  }

  /**
   * Close the input handler
   */
  close() {
    this.inputHandler.close();
  }
}

export default UserInputManager;
