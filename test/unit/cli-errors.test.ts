import { spawn, spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { stripVTControlCharacters } from 'node:util'
import { describe, expect, it } from 'vite-plus/test'
import { builtinCiphers } from '../../src/core/ciphers.ts'
import { version } from '../../src/version.ts'

const cliPath = fileURLToPath(new URL('../../src/cli.ts', import.meta.url))

/**
 * Run `src/cli.ts` with plain Node, no loader: the sources name every relative import with its `.ts`
 * extension.
 *
 * @param args - CLI arguments.
 * @param env - Environment for the child, the parent's when left out.
 * @returns {SpawnSyncReturns<string>} The spawn result.
 */
function runCli(
  args: readonly string[],
  env?: Readonly<NodeJS.ProcessEnv>,
): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    timeout: 10_000,
    env,
  })
}

describe('CLI domain errors', () => {
  it('prints an unknown cipher as one line without a stack trace', () => {
    const result = runCli(['encode', 'unknown', 'foo'])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe(
      `Unknown cipher: "unknown". Registered ciphers: ${builtinCiphers.join(', ')}\n`,
    )
  })
})

describe('CLI cipher categories', () => {
  it('lists the built-ins under their category', () => {
    const result = runCli(['ciphers', '--category', 'classical'], {
      ...process.env,
      CONSOLA_LEVEL: '3',
    })

    expect(result.status).toBe(0)
    const output = `${result.stdout}${result.stderr}`
    expect(output).toContain('Available classical ciphers:')
    expect(output).toContain('caesar')
    expect(output).toContain('enigma')
    expect(output).not.toMatch(/\baes\b/)
  })

  it('rejects a category the registry does not use', () => {
    const result = runCli(['ciphers', '--category', 'hash'])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe(
      'Invalid option category=hash: must be one of classical, block, stream\n',
    )
  })

  it('names the category in cipher info', () => {
    const result = runCli(['info', 'playfair'], { ...process.env, CONSOLA_LEVEL: '3' })

    expect(result.status).toBe(0)
    expect(`${result.stdout}${result.stderr}`).toContain('Category: classical')
  })
})

describe('CLI frequency language', () => {
  it('rejects a language the other surfaces do not accept', () => {
    const result = runCli(['frequency', 'HELLO', '--lang', 'de'])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe('Invalid option lang=de: must be en, pl or ja\n')
  })

  it('rejects a language that only matches after case folding', () => {
    const result = runCli(['frequency', 'HELLO', '-l', 'PL'])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe('Invalid option lang=PL: must be en, pl or ja\n')
  })

  it('keeps English as the default reference order', () => {
    const result = runCli(['frequency', 'HELLO'], {
      ...process.env,
      CONSOLA_LEVEL: '3',
    })

    expect(result.status).toBe(0)
    expect(`${result.stdout}${result.stderr}`).toContain('lang=en')
    expect(`${result.stdout}${result.stderr}`).toContain(
      'E T A O I N S H R D L C U M W F G Y P B V K J X Q Z',
    )
  })

  it('prints the Polish reference order for --lang pl', () => {
    const result = runCli(['frequency', 'HELLO', '--lang', 'pl'], {
      ...process.env,
      CONSOLA_LEVEL: '3',
    })

    expect(result.status).toBe(0)
    expect(`${result.stdout}${result.stderr}`).toContain('lang=pl')
    expect(`${result.stdout}${result.stderr}`).toContain(
      'A I O E Z N R W S T C Y K D P M U J L B G H F Q V X',
    )
  })

  it('prints the Hepburn reference order for --lang ja', () => {
    const result = runCli(['frequency', 'KONNICHIWA', '--lang', 'ja'], {
      ...process.env,
      CONSOLA_LEVEL: '3',
    })

    expect(result.status).toBe(0)
    expect(`${result.stdout}${result.stderr}`).toContain('lang=ja')
    expect(`${result.stdout}${result.stderr}`).toContain(
      'A O N I T E R U H S K D M G Y B W C Z J F P L Q V X',
    )
  })
})

describe('CLI key length estimate', () => {
  it('puts the keyword length and the keyword first', () => {
    const result = runCli(
      [
        'period',
        'CHREEVOAHMAERATBIAXXWTNXBEEOPHBSBQMQEQERBWRVXUOAKXAOSXXWEAHBWGJMMQMNKGRFVGXWTRZXWIAKLXFPSKAUTEMNDCMGTSXMXBTUIADNGMGPSRELXNJELXVRVPRTULHDNQWTWDTYGBPHXTFALJHASVBFXNGLLCHRZBWELEKMSJIKNBHWRJGNMGJSGLXFEYPHAGNRBIEQJTAMRVLCRREMNDGLXRRIMGNSNRWCHRQHAEYEVTAQEBBIPEEWEVKAKOEWADREMXMTBHHCHRTKDNVRZCHRCLQOHPWQAIIWXNRMGWOIIFKEE',
      ],
      { ...process.env, CONSOLA_LEVEL: '3' },
    )

    expect(result.status).toBe(0)
    const output = stripVTControlCharacters(`${result.stdout}${result.stderr}`)
    expect(output).toContain('Key length estimate (313 letters, lang=en), most likely first:')
    expect(output).toContain('  length  5  IoC 0.0666  key JANET\n')
    expect(output).toContain('Kasiski: 12 trigram distances, most divided by 5 (10)')
    expect(output).toContain('ciphers decode vigenere "<text>" --key JANET')
  })

  it('rejects a longest length below 2 as one line', () => {
    const result = runCli(['period', 'ABCDEF', '--max-period', '1'])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe('Invalid option max-period=1: must be an integer of at least 2\n')
  })
})

describe('CLI family guess', () => {
  it('ranks the families with the command to run next', () => {
    const result = runCli(['guess', 'FMXVEDKAPHFERBNDKRXRSREFMORUDSDKDVSHVUFEDKAPRKDLYEVLRHHRH'], {
      ...process.env,
      CONSOLA_LEVEL: '3',
    })

    expect(result.status).toBe(0)
    const output = stripVTControlCharacters(`${result.stdout}${result.stderr}`)
    expect(output).toContain('Family guess (57 characters, 57 letters, lang=en, IoC 0.0627)')
    expect(output).toContain(
      '  1. substitution-multiplicative, substitution-shift, substitution-reflection (medium): affine, caesar, atbash\n',
    )
    expect(output).toContain('     Next: ciphers decode affine "<text>" --a 3 --b 5\n')
  })

  it('rejects a language without a table as one line', () => {
    const result = runCli(['guess', 'ABCDEF', '--lang', 'de'])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe('Invalid option lang=de: must be en, pl or ja\n')
  })
})

describe('CLI crib drag', () => {
  const first = '315c4eeaa8b5f8aaf9174145bf43e1784b8fa00dc71d885a804e5ee9'
  const target = '32510ba9babebbbefd001547a810e67149caee11d945cd7fc81a05e9'

  it('ranks the places and prints what known gives', () => {
    const result = runCli(
      [
        'crib',
        first,
        target,
        '--crib',
        'The secret',
        '--known',
        '[{"message":1,"offset":0,"text":"The"}]',
      ],
      { ...process.env, CONSOLA_LEVEL: '3' },
    )

    expect(result.status).toBe(0)
    const output = stripVTControlCharacters(`${result.stdout}${result.stderr}`)
    expect(output).toContain('Crib drag "The secret" across 2 ciphertexts (lang=en)')
    expect(output).toContain('  1. #1 at 0 (score ')
    expect(output).toContain('): #0 "We can fac"\n')
    expect(output).toContain(`Key (?? unknown): 66396e${'??'.repeat(25)}`)
    expect(output).toContain(`  #0 "We ${'·'.repeat(25)}"\n`)
  })

  it('rejects known that is not a JSON array of placements as one line', () => {
    const result = runCli(['crib', first, target, '--known', '{"message":0}'])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe(
      'Invalid option known=JSON: must be a JSON array of {"message": 0, "offset": 0, "text": "..."}\n',
    )
  })
})

describe('CLI hidden text', () => {
  it('ranks the readings with the flags that read each again', () => {
    const telegram =
      "PRESIDENT'S EMBARGO RULING SHOULD HAVE IMMEDIATE NOTICE. GRAVE SITUATION AFFECTING INTERNATIONAL LAW. STATEMENT FORESHADOWS RUIN OF MANY NEUTRALS. YELLOW JOURNALS UNIFYING NATIONAL EXCITEMENT IMMENSELY."
    const result = runCli(['hidden', telegram], { ...process.env, CONSOLA_LEVEL: '3' })

    expect(result.status).toBe(0)
    const output = stripVTControlCharacters(`${result.stdout}${result.stderr}`)
    expect(output).toContain(
      'Hidden text (68 readings tried, lang=en), most like the language first:',
    )
    expect(output).toContain('   0.19  PERSHINGSAILSFROMNYJUNEI  --pick word --letter 1\n')
  })

  it('reads one pick and refuses flags that need another', () => {
    expect(runCli(['hidden', 'one two three', '--pick', 'word', '--letter', '-1']).stdout).toBe(
      'eoe\n',
    )
    const cases = [
      [['--every', '2'], 'Missing required option: pick\n'],
      [
        ['--pick', 'line', '--lang', 'pl'],
        'Invalid option lang=pl: ranks the readings, so it does not apply with --pick\n',
      ],
      [['--pick', 'word', '--letter', 'two'], 'Invalid option letter=two: must be an integer\n'],
      [['--lang', 'de'], 'Invalid option lang=de: must be en, pl or ja\n'],
    ] as const
    for (const [flags, message] of cases) {
      const result = runCli(['hidden', 'abc', ...flags])
      expect(result.status).toBe(1)
      expect(result.stderr).toBe(message)
    }
  })
})

describe('CLI key recovery', () => {
  it('prints the keys and the command that reads the text', () => {
    const plain =
      'To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler.'
    const result = runCli(['encode', 'vigenere', plain, '--key', 'WATSON'])
    const recovered = runCli(['recover', result.stdout.trim(), '-c', 'vigenere', '--limit', '1'], {
      ...process.env,
      CONSOLA_LEVEL: '3',
    })

    expect(recovered.status).toBe(0)
    const output = stripVTControlCharacters(`${recovered.stdout}${recovered.stderr}`)
    expect(output).toContain('vigenere keys (183 letters, lang=en), best first')
    expect(output).toContain(`  1. key WATSON  fit -`)
    expect(output).toContain(plain)
    expect(output).toContain('Next: ciphers decode vigenere "<text>" --key WATSON')
  })

  it('rejects a key length for another cipher as one line', () => {
    const result = runCli(['recover', 'Hello there', '-c', 'vigenere', '--key-length', '3'])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe('Invalid option keyLength=3: only columnar takes it\n')
  })
})

describe('CLI Caesar brute force', () => {
  /**
   * Run `ciphers brute` and keep its shift lines without the terminal styling.
   *
   * @param args - Arguments after `brute`.
   * @returns {string[]} One `shift=N → text` line per shift, in printed order.
   */
  function bruteLines(args: readonly string[]): string[] {
    const result = runCli(['brute', ...args], { ...process.env, CONSOLA_LEVEL: '3' })
    expect(result.status).toBe(0)
    return stripVTControlCharacters(`${result.stdout}${result.stderr}`)
      .split('\n')
      .filter((line) => line.includes('shift='))
      .map((line) => line.slice(line.indexOf('shift=')))
  }

  it('puts the best English fit first by default', () => {
    const lines = bruteLines(['DWWDFN DW GDZQ'])

    expect(lines).toHaveLength(25)
    expect(lines[0]).toBe('shift= 3 → ATTACK AT DAWN')
  })

  it('ranks by the language --lang names and keeps every line whole', () => {
    const polish = 'OLWZR RMFCBCQR PRMD WB MHVWHV MDN CGURZLH'
    const lines = bruteLines([polish, '--lang', 'pl'])

    expect(lines).toHaveLength(25)
    expect(lines[0]).toBe('shift= 3 → LITWO OJCZYZNO MOJA TY JESTES JAK ZDROWIE')
    const long = bruteLines([polish.repeat(4), '--lang', 'pl'])
    expect(long.every((line) => line.length === 'shift= 3 → '.length + polish.length * 4)).toBe(
      true,
    )
    expect(bruteLines([polish])[0]).not.toContain('LITWO')
    expect(bruteLines(['NLPLJDBR ZD FKLBR QL BDFKLBR QL', '-l', 'ja'])[0]).toBe(
      'shift= 3 → KIMIGAYO WA CHIYO NI YACHIYO NI',
    )
  })

  it('keeps shift order when nothing is a letter', () => {
    const lines = bruteLines(['1234'])

    expect(lines[0]).toBe('shift= 1 → 1234')
    expect(lines[24]).toBe('shift=25 → 1234')
  })

  it('rejects a language the other surfaces do not accept', () => {
    const result = runCli(['brute', 'KHOOR', '--lang', 'de'])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe('Invalid option lang=de: must be en, pl or ja\n')
  })
})

describe('CLI bold text', () => {
  const commands = [
    'info caesar',
    'ciphers --category stream',
    'ciphers --category stream --verbose',
    'brute KHOOR',
    'frequency HELLO',
  ]
  const { FORCE_COLOR: _force, NO_COLOR: _noColor, ...env } = process.env

  it.each(commands)('prints no escape codes into a pipe: %s', (command) => {
    const result = runCli(command.split(' '), { ...env, CONSOLA_LEVEL: '3' })

    expect(result.status).toBe(0)
    expect(`${result.stdout}${result.stderr}`).not.toContain('\u001B[')
  })

  it.each(commands)('keeps bold when FORCE_COLOR asks for it: %s', (command) => {
    const result = runCli(command.split(' '), { ...env, CONSOLA_LEVEL: '3', FORCE_COLOR: '1' })

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('\u001B[1m')
  })
})

describe('CLI builtin flags', () => {
  it('prints the version instead of the encode usage', () => {
    const result = runCli(['--version'])

    expect(result.status).toBe(0)
    expect(result.stdout).toBe(`${version}\n`)
    expect(result.stderr).toBe('')
  })

  it('prints the main usage with every subcommand', () => {
    const result = runCli(['--help'])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('ciphers encode|decode|ciphers|info|brute|mcp|frequency')
    expect(result.stderr).toBe('')
  })
})

describe('CLI closed stdout', () => {
  it.each([['ciphers'], ['brute', 'KHOOR ZRUOG']])(
    'ends `%s` quietly when the reader goes away',
    async (...args) => {
      const child = spawn(process.execPath, [cliPath, ...args], {
        env: { ...process.env, CONSOLA_LEVEL: '3' },
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 10_000,
      })
      // Closing the read end before the child writes makes its first write fail with EPIPE, as
      // after `| head -1`.
      child.stdout.destroy()
      let stderr = ''
      child.stderr.setEncoding('utf8').on('data', (chunk: string) => (stderr += chunk))
      await once(child, 'close')

      expect(stderr).toBe('')
      expect(child.exitCode).toBe(0)
    },
  )
})

describe('CLI host locale', () => {
  /** Estonian collation puts Z before T, Lithuanian puts Y before J; the key order stays A to Z. */
  it.each([
    ['et_EE.UTF-8', 'TZ'],
    ['lt_LT.UTF-8', 'JY'],
  ])('orders columns A to Z under %s', (locale, key) => {
    const env = { ...process.env, LC_ALL: locale, LANG: locale }

    expect(runCli(['encode', 'columnar', 'ABCDEF', '--key', key], env).stdout).toBe('ACEBDF\n')
    expect(runCli(['decode', 'columnar', 'ACEBDF', '--key', key], env).stdout).toBe('ABCDEF\n')
    expect(
      runCli(['encode', 'adfgvx', 'HELLO', '--key', 'KEY', '--transposition', key], env).stdout,
    ).toBe(runCli(['encode', 'adfgvx', 'HELLO', '--key', 'KEY', '--transposition', 'AB']).stdout)
  })
})

describe('CLI dashed text', () => {
  it('decodes Morse that starts with a dash, with or without --', () => {
    expect(runCli(['decode', 'morse', '-.-. .- -']).stdout).toBe('CAT\n')
    expect(runCli(['decode', 'morse', '--', '-.-. .- -']).stdout).toBe('CAT\n')
  })

  it('keeps a group of short options that starts with a boolean', () => {
    const result = runCli(['ciphers', '-vcstream'], { ...process.env, CONSOLA_LEVEL: '3' })

    expect(result.status).toBe(0)
    expect(`${result.stdout}${result.stderr}`).toContain('Category: stream')
  })

  it('names a dashed argument that fits nowhere in one line', () => {
    const result = runCli(['decode', 'morse', '...', '--kye', 'x'])

    expect(result.status).toBe(1)
    expect(result.stdout).toBe('')
    expect(result.stderr).toBe(
      'Unknown option "--kye" for decode. Text that starts with - goes after --, which ends the options.\n',
    )
  })
})
