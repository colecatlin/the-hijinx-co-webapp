/**
 * String utility functions used across backend functions
 */

export function normalizeName(name) {
  return (name || '').toLowerCase().trim();
}

export function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function normalizeManufacturer(mfr) {
  const m = (mfr || '').toLowerCase();
  if (m.includes('toyota')) return 'Toyota';
  if (m.includes('ford')) return 'Ford';
  if (m.includes('chevy') || m.includes('chevrolet')) return 'Chevrolet';
  if (m.includes('honda')) return 'Honda';
  return 'Other';
}

export function areNameVariations(name1, name2) {
  const n1 = normalizeName(name1);
  const n2 = normalizeName(name2);
  
  // Exact match
  if (n1 === n2) return true;
  
  // One contains the other (e.g., "Perez De Lara" and "Perez")
  if (n1.includes(n2) || n2.includes(n1)) return true;
  
  // Check if all words from shorter name are in longer name
  const shorter = n1.length <= n2.length ? n1 : n2;
  const longer = n1.length > n2.length ? n1 : n2;
  const shorterWords = shorter.split(/\s+/);
  const longerWords = longer.split(/\s+/);
  
  if (shorterWords.length < longerWords.length) {
    const allWordsMatch = shorterWords.every(w => longerWords.some(lw => lw === w || lw.startsWith(w)));
    if (allWordsMatch) return true;
  }
  
  return false;
}

export function createDriverKey(firstName, lastName) {
  return `${normalizeName(firstName)} ${normalizeName(lastName)}`;
}