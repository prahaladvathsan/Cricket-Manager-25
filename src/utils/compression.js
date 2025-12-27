/**
 * @file compression.js
 * @description Compression utilities for save game files using pako (gzip)
 */

import pako from 'pako';

/**
 * Compress JSON data to Base64 string
 * @param {Object} data - Data to compress
 * @returns {string} Base64 encoded compressed string
 */
export function compressData(data) {
  try {
    const jsonString = JSON.stringify(data);
    const compressed = pako.deflate(jsonString);

    // Convert Uint8Array to Base64
    let binary = '';
    const bytes = new Uint8Array(compressed);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
  } catch (error) {
    console.error('Compression error:', error);
    throw new Error('Failed to compress data');
  }
}

/**
 * Decompress Base64 string to JSON data
 * @param {string} base64 - Base64 encoded compressed string
 * @returns {Object} Decompressed data
 */
export function decompressData(base64) {
  try {
    // Convert Base64 to Uint8Array
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Decompress
    const decompressed = pako.inflate(bytes, { to: 'string' });
    return JSON.parse(decompressed);
  } catch (error) {
    console.error('Decompression error:', error);
    throw new Error('Failed to decompress data. File may be corrupted.');
  }
}

/**
 * Get compression statistics for debugging
 * @param {Object} data - Data to check
 * @returns {Object} {original, compressed, ratio, savings}
 */
export function getCompressionStats(data) {
  const jsonString = JSON.stringify(data);
  const original = jsonString.length;
  const compressed = compressData(data).length;
  const savings = original - compressed;
  const ratio = ((1 - compressed / original) * 100).toFixed(1);

  return {
    original,
    compressed,
    savings,
    ratio: `${ratio}%`,
    originalKB: (original / 1024).toFixed(2),
    compressedKB: (compressed / 1024).toFixed(2)
  };
}

/**
 * Validate that data can be compressed and decompressed without loss
 * @param {Object} data - Data to validate
 * @returns {boolean} True if round-trip is successful
 */
export function validateCompression(data) {
  try {
    const compressed = compressData(data);
    const decompressed = decompressData(compressed);

    // Deep compare original and decompressed
    return JSON.stringify(data) === JSON.stringify(decompressed);
  } catch (error) {
    console.error('Compression validation failed:', error);
    return false;
  }
}

/**
 * Custom serializer for Zustand's createJSONStorage that compresses data
 * Use with: createJSONStorage(() => localStorage, { serialize: compressedSerialize, deserialize: compressedDeserialize })
 */
export function compressedSerialize(state) {
  try {
    const compressed = compressData(state);
    return '__COMPRESSED__:' + compressed;
  } catch (error) {
    console.error('Failed to compress state:', error);
    // Fallback to regular JSON
    return JSON.stringify(state);
  }
}

/**
 * Custom deserializer for Zustand's createJSONStorage that decompresses data
 */
export function compressedDeserialize(str) {
  try {
    if (str.startsWith('__COMPRESSED__:')) {
      const base64 = str.slice('__COMPRESSED__:'.length);
      return decompressData(base64);
    }
    // Legacy uncompressed data
    return JSON.parse(str);
  } catch (error) {
    console.warn('Failed to decompress state:', error.message);
    // Try parsing as regular JSON
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }
}

/**
 * Get compressed storage options for Zustand's createJSONStorage
 * Usage: storage: createJSONStorage(() => localStorage, compressedStorageOptions)
 * @returns {Object} Options object with serialize and deserialize functions
 */
export const compressedStorageOptions = {
  serialize: compressedSerialize,
  deserialize: compressedDeserialize
};
