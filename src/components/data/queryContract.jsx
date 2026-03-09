/**
 * components/data/queryContract.js
 *
 * Central query key contract for Index46.
 *
 * Re-exports the canonical QueryKeys from utils/queryKeys so any file in the
 * codebase can import from one stable location:
 *
 *   import { QueryKeys } from '@/components/data/queryContract';
 *
 * or continue using the original path:
 *
 *   import { QueryKeys } from '@/components/utils/queryKeys';
 *
 * Both resolve to the same object — prefer this path for new code.
 */

export { QueryKeys } from '@/components/utils/queryKeys';