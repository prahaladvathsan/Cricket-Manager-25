// Node loader hook: adds `with { type: 'json' }` to all .json imports so the
// Vite-style bare imports in the source still resolve in plain Node 22+.
// Registered via `node --import scripts/register-json-loader.mjs ...`.

export async function resolve(specifier, context, nextResolve) {
  const result = await nextResolve(specifier, context);
  if (result.url && result.url.endsWith('.json')) {
    return {
      ...result,
      importAttributes: { ...(result.importAttributes || {}), type: 'json' }
    };
  }
  return result;
}

export async function load(url, context, nextLoad) {
  if (url.endsWith('.json')) {
    return nextLoad(url, { ...context, importAttributes: { ...(context.importAttributes || {}), type: 'json' } });
  }
  return nextLoad(url, context);
}
