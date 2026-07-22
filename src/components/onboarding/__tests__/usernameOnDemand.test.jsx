import { describe, it, expect } from 'vitest';
// Pure helpers under test. These modules are safe to import in a test env:
// the actual network/hook work happens inside exported *functions* or
// components, never at module top level.
import { suggestUsernameCandidates } from '@/components/onboarding/UsernameFieldWithCheck';
import { resolveReturnPath, buildUsernameReturnPath } from '@/hooks/useUsernameRequired';

/**
 * These tests cover the PURE logic shared by both the onboarding Identity
 * stage and the lightweight ClaimUsername flow. They do not exercise the
 * debounced server availability check (that's an integration concern owned by
 * the backend `checkUsernameUnique` function).
 *
 * Run with: `npx vitest` once vitest is added to the project.
 */

describe('suggestUsernameCandidates', () => {
  it('returns [] when both names are empty', () => {
    expect(suggestUsernameCandidates({})).toEqual([]);
    expect(suggestUsernameCandidates({ firstName: '  ', lastName: '' })).toEqual([]);
  });

  it('builds the expected candidate set from a first/last name pair', () => {
    const out = suggestUsernameCandidates({ firstName: 'Jordan', lastName: 'Racer' });
    expect(out).toContain('jordan');
    expect(out).toContain('racer');
    expect(out).toContain('jordanracer');
    expect(out).toContain('jordan_racer');
    expect(out).toContain('jordan.racer');
    expect(out).toContain('jracer');
    expect(out).toContain('jordanracer46');
    expect(out).toContain('jordanracer_46');
  });

  it('lowercases and strips non [a-z0-9_] characters', () => {
    const out = suggestUsernameCandidates({ firstName: "O'Neil", lastName: 'Smith-Jones' });
    expect(out.every((s) => /^[a-z0-9_]+$/.test(s))).toBe(true);
    expect(out).toContain('oneil');
    expect(out).toContain('smithjones');
  });

  it('drops candidates shorter than 3 or longer than 24 chars', () => {
    const out = suggestUsernameCandidates({ firstName: 'Al', lastName: 'Bo' });
    expect(out.every((s) => s.length >= 3 && s.length <= 24)).toBe(true);
    // 'al' / 'bo' are length 2 → filtered out; 'albo' is 4 → kept.
    expect(out).toContain('albo');
    expect(out).not.toContain('al');
    expect(out).not.toContain('bo');
  });

  it('de-duplicates candidates', () => {
    const out = suggestUsernameCandidates({ firstName: 'jordan', lastName: 'jordan' });
    expect(new Set(out).size).toBe(out.length);
  });

  it('works with only a first name', () => {
    const out = suggestUsernameCandidates({ firstName: 'Max', lastName: '' });
    // 'max' is exactly 3 chars and passes the filter.
    expect(out).toContain('max');
    expect(out).toContain('max46');
  });
});

describe('resolveReturnPath', () => {
  it('defaults to /MyDashboard when there is no return_to', () => {
    expect(resolveReturnPath('')).toBe('/MyDashboard');
    expect(resolveReturnPath(new URLSearchParams('foo=bar'))).toBe('/MyDashboard');
  });

  it('honours same-origin absolute paths', () => {
    const q = new URLSearchParams({ return_to: '/racecore/drivers/abc?tab=results' });
    expect(resolveReturnPath(q)).toBe('/racecore/drivers/abc?tab=results');
  });

  it('rejects open-redirect attempts (non-leading-slash, protocol, etc.)', () => {
    expect(resolveReturnPath(new URLSearchParams({ return_to: 'https://evil.example' })))
      .toBe('/MyDashboard');
    expect(resolveReturnPath(new URLSearchParams({ return_to: '//evil.example' })))
      .toBe('/MyDashboard');
    expect(resolveReturnPath(new URLSearchParams({ return_to: 'evil' })))
      .toBe('/MyDashboard');
  });
});

describe('buildUsernameReturnPath', () => {
  it('joins pathname + search', () => {
    expect(buildUsernameReturnPath({ pathname: '/profile', search: '?tab=identity' }))
      .toBe('/profile?tab=identity');
  });

  it('returns "/" for falsy input', () => {
    expect(buildUsernameReturnPath(null)).toBe('/');
    expect(buildUsernameReturnPath(undefined)).toBe('/');
  });

  it('treats a missing search as empty string', () => {
    expect(buildUsernameReturnPath({ pathname: '/profile' })).toBe('/profile');
  });
});