import type { CipherConstructor } from '../core/cipher'
import { block } from './block/index'
import { classical } from './classical/index'

/** Every cipher the package ships, category by category. Not in this list, not in the registry. */
export const builtins: readonly CipherConstructor[] = [...classical, ...block]
