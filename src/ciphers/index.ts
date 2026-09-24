import type { CipherConstructor } from '../core/cipher.ts'
import { block } from './block/index.ts'
import { classical } from './classical/index.ts'

/** Every cipher the package ships, category by category. Not in this list, not in the registry. */
export const builtins: readonly CipherConstructor[] = [...classical, ...block]
