export function createPageUrl(pageName, params = {}) {
  const queryString = Object.keys(params).length > 0
    ? '?' + new URLSearchParams(params).toString()
    : '';
  return `/${pageName}${queryString}`;
}