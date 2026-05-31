/** Base error for cipherhouse. */
export class CipherError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CipherError'
  }
}

/** Cipher not found in registry. */
export class UnknownCipherError extends CipherError {
  constructor(public readonly cipher: string) {
    super(`Unknown cipher: ${cipher}`)
    this.name = 'UnknownCipherError'
  }
}

/** Invalid option value. */
export class InvalidOptionError extends CipherError {
  constructor(
    public readonly option: string,
    public readonly value: unknown,
    public readonly reason: string,
  ) {
    super(`Invalid option ${option}=${value}: ${reason}`)
    this.name = 'InvalidOptionError'
  }
}

/** Missing required option. */
export class MissingOptionError extends CipherError {
  constructor(public readonly option: string) {
    super(`Missing required option: ${option}`)
    this.name = 'MissingOptionError'
  }
}

/** Normalizes any thrown value into a CipherError. */
export function normalizeError(error: unknown, cipher?: string): CipherError {
  if (error instanceof CipherError) return error
  const msg = error instanceof Error ? error.message : String(error)
  return new CipherError(cipher ? `[${cipher}] ${msg}` : msg)
}
