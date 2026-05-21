/**
 * @file templates/index.js
 * @description Aggregates all news template JSON files into a single registry
 * keyed by event type. Add new template files here.
 */

import injury from './injury.json';
import retention from './retention.json';
import transfer from './transfer.json';
import playoff from './playoff.json';
import match from './match.json';
import season from './season.json';
import roundup from './roundup.json';

const TEMPLATES = {
  ...injury,
  ...retention,
  ...transfer,
  ...playoff,
  ...match,
  ...season,
  ...roundup
};

export default TEMPLATES;
