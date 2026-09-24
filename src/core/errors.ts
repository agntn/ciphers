/** Base error for ciphers. */
export class CipherError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CipherError'
  }
}

/**
 * Cipher not found in registry. The name is quoted, so a newline or an escape sequence in it
 * stays inside the message, and the message lists the registered names to pick from.
 */
export class UnknownCipherError extends CipherError {
  readonly cipher: string
  readonly registered: readonly string[]

  constructor(cipher: string, registered: readonly string[] = []) {
    const choices = registered.length > 0 ? `. Registered ciphers: ${registered.join(', ')}` : ''
    super(`Unknown cipher: ${JSON.stringify(cipher)}${choices}`)
    this.cipher = cipher
    this.registered = registered
    this.name = 'UnknownCipherError'
  }
}

/** Invalid option value. */
export class InvalidOptionError extends CipherError {
  readonly option: string
  readonly value: unknown
  readonly reason: string

  constructor(option: string, value: unknown, reason: string) {
    super(`Invalid option ${option}=${String(value)}: ${reason}`)
    this.option = option
    this.value = value
    this.reason = reason
    this.name = 'InvalidOptionError'
  }
}

/** Missing required option. */
export class MissingOptionError extends CipherError {
  readonly option: string

  constructor(option: string) {
    super(`Missing required option: ${option}`)
    this.option = option
    this.name = 'MissingOptionError'
  }
}

/**
 * Normalize any thrown value into a CipherError.
 *
 * @param error - Thrown value.
 * @param cipher - Optional cipher name to include in the message.
 * @returns {CipherError} The existing or newly wrapped cipher error.
 */
export function normalizeError(error: unknown, cipher?: string): CipherError {
  if (error instanceof CipherError) return error
  const msg = error instanceof Error ? error.message : String(error)
  return new CipherError(cipher ? `[${cipher}] ${msg}` : msg)
}
