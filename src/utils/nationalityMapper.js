/**
 * @file nationalityMapper.js
 * @description Maps full country names to ISO 3166-1 alpha-2 codes for flag icons
 */

/**
 * Map of full nationality names (from player database) to ISO country codes
 * Used with country-flag-icons package which requires ISO codes
 */
export const NATIONALITY_TO_ISO = {
  'Afghanistan': 'AF',
  'Australia': 'AU',
  'Bangladesh': 'BD',
  'Canada': 'CA',
  'England': 'GB',  // England uses Great Britain flag (GB)
  'India': 'IN',
  'Ireland': 'IE',
  'Namibia': 'NA',
  'Nepal': 'NP',
  'Netherlands': 'NL',
  'New Zealand': 'NZ',
  'Oman': 'OM',
  'Pakistan': 'PK',
  'Scotland': 'GB',  // Scotland uses Great Britain flag (GB) - could use custom if needed
  'South Africa': 'ZA',
  'Sri Lanka': 'LK',
  'United Arab Emirates': 'AE',
  'United States of America': 'US',
  'West Indies': 'WI',  // Note: West Indies doesn't have official ISO code, will need custom handling
  'Zimbabwe': 'ZW'
};

/**
 * Get ISO country code from full nationality name
 * @param {string} nationality - Full nationality name (e.g., 'Australia')
 * @returns {string|null} ISO country code (e.g., 'AU') or null if not found
 */
export const getISOFromNationality = (nationality) => {
  return NATIONALITY_TO_ISO[nationality] || null;
};

/**
 * Check if a nationality has a flag available
 * @param {string} nationality - Full nationality name
 * @returns {boolean} True if flag is available
 */
export const hasFlagIcon = (nationality) => {
  return nationality in NATIONALITY_TO_ISO;
};

/**
 * Get all available nationalities
 * @returns {string[]} Array of all nationality names
 */
export const getAllNationalities = () => {
  return Object.keys(NATIONALITY_TO_ISO);
};
