function formatScope(scope) {
  return `[${scope}]`;
}

function warn(scope, message, meta) {
  if (meta !== undefined) {
    console.warn(formatScope(scope), message, meta);
    return;
  }
  console.warn(formatScope(scope), message);
}

function error(scope, message, errOrMeta) {
  if (errOrMeta !== undefined) {
    console.error(formatScope(scope), message, errOrMeta);
    return;
  }
  console.error(formatScope(scope), message);
}

module.exports = { warn, error };
