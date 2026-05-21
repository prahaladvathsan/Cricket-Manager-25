/**
 * @file newsDispatcherSingleton.js
 * @description Shared NewsDispatcher instance. Mirrors transferManagerSingleton
 * pattern so every hook point in Header.jsx, SimulationEngine, store actions,
 * and UI components emits through the same bus.
 *
 * @module core/news/newsDispatcherSingleton
 */

import NewsDispatcher from './NewsDispatcher.js';

let sharedInstance = null;
let inboxSubscriberRegistered = false;

/**
 * Get (or lazily create) the shared NewsDispatcher singleton.
 * @returns {NewsDispatcher}
 */
export function getNewsDispatcher() {
  if (!sharedInstance) {
    sharedInstance = new NewsDispatcher();
  }
  return sharedInstance;
}

/**
 * Register the built-in inbox bridge subscriber. Idempotent.
 * Call once after store hydration completes (App.jsx).
 */
export async function registerInboxSubscriber() {
  if (inboxSubscriberRegistered) return;
  const { default: inboxSubscriber } = await import('./subscribers/inboxSubscriber.js');
  const dispatcher = getNewsDispatcher();
  dispatcher.subscribe(inboxSubscriber, { types: ['*'] });
  inboxSubscriberRegistered = true;
  console.log('📰 [NewsDispatcher] Inbox subscriber registered');
}

/**
 * Reset (for testing / new-game).
 */
export function resetNewsDispatcher() {
  if (sharedInstance) sharedInstance.clear();
  sharedInstance = null;
  inboxSubscriberRegistered = false;
}
