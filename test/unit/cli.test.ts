import { spawn, spawnSync, type SpawnSyncReturns } from 'node:child_process'
import { once } from 'node:events'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vite-plus/test'
import { version } from '../../src/version.ts'

const cliPath = fileURLToPath(new URL('../../src/cli.ts', import.meta.url))

/**
 * Run `src/cli.ts` with plain Node, no loader: the sources name every relative import with its `.ts`
 * extension.
 *
 * @param args - CLI arguments.
 * @param options - Text for the child's stdin and its environment, the parent's when left out.
 * @returns {SpawnSyncReturns<string>} The spawn result.
 */
function runCli(
  args: readonly string[],
  options: Readonly<{ input?: string; env?: Readonly<NodeJS.ProcessEnv> }> = {},
): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [cliPath, ...args], {
    encoding: 'utf8',
    timeout: 10_000,
    input: options.input ?? '',
    env: options.env,
  })
}

/**
 * Expect a refusal: one line on stderr, nothing on stdout, exit code 1.
 *
 * @param args - CLI arguments.
 * @param line - The whole line stderr should hold.
 */
function expectRefusal(args: readonly string[], line: string): void {
  const result = runCli(args)

  expect(result.status).toBe(1)
  expect(result.stdout).toBe('')
  expect(result.stderr).toBe(`${line}\n`)
}

describe('CLI commands', () => {
  it('lists every tool under its old command name, with mcp', () => {
    const result = runCli(['--help'])

    expect(result.status).toBe(0)
    const commands = [...result.stdout.matchAll(/^ {2}(\S[^ ]*(?:, \S+)?) {2}/gm)].map(
      (match) => match[1],
    )
    expect(commands).toEqual([
      'encode',
      'decode',
      'brute',
      'frequency',
      'period',
      'guess',
      'probe',
      'crib',
      'hidden',
      'recover',
      'info, ciphers',
      'mcp',
    ])
  })

  it('prints the version alone', () => {
    const result = runCli(['--version'])

    expect(result.status).toBe(0)
    expect(result.stdout).toBe(`${version}\n`)
    expect(result.stderr).toBe('')
  })

  it('lists the ciphers on an empty line and encodes when the first word is a cipher', () => {
    expect(runCli([]).stdout).toMatch(/^classical:\n {2}caesar /u)
    expect(runCli(['caesar', 'HELLO']).stdout).toBe('KHOOR\n')
  })
})

describe('CLI refusals', () => {
  it('prints a cipher failure as one line without a stack trace', () => {
    expectRefusal(
      ['decode', 'bacon', 'ABC'],
      'Invalid Bacon code: 2 letters A and B, not a multiple of five',
    )
  })

  it('refuses what the schema refuses, naming the flag that was typed', () => {
    expectRefusal(
      ['ciphers', '--category', 'hash'],
      'Invalid arguments at --category: must be one of classical, block, stream',
    )
    expectRefusal(
      ['frequency', 'HELLO', '--lang', 'de'],
      'Invalid arguments at --lang: must be one of en, pl, ja',
    )
    expectRefusal(
      ['period', 'ABCDEF', '--max-period', '1'],
      'Invalid arguments at --max-period: must be >= 2',
    )
  })

  it('refuses a flag that belongs to another pick or cipher', () => {
    expectRefusal(['hidden', 'abc', '--every', '2'], 'Missing required option: pick')
    expectRefusal(
      ['recover', 'Hello there', '--cipher', 'vigenere', '--key-length', '3'],
      'Invalid option keyLength=3: only columnar takes it',
    )
  })
})

describe('CLI cipher info', () => {
  it('lists one category and names it in cipher info', () => {
    const listed = runCli(['ciphers', '--category', 'classical'])

    expect(listed.status).toBe(0)
    expect(listed.stdout).toContain('caesar')
    expect(listed.stdout).toContain('enigma')
    expect(listed.stdout).not.toMatch(/\baes\b/)
    expect(runCli(['info', 'playfair']).stdout).toContain('Playfair (playfair) — classical')
  })
})

describe('CLI analysis', () => {
  it('prints the reference order of the language --lang names', () => {
    const orders = [
      [['HELLO'], 'Expected (en): E T A O I N S H R D L C U M W F G Y P B V K J X Q Z'],
      [
        ['HELLO', '--lang', 'pl'],
        'Expected (pl): A I O E Z N R W S T C Y K D P M U J L B G H F Q V X',
      ],
      [
        ['KONNICHIWA', '--lang', 'ja'],
        'Expected (ja): A O N I T E R U H S K D M G Y B W C Z J F P L Q V X',
      ],
    ] as const
    for (const [args, line] of orders) {
      expect(runCli(['frequency', ...args]).stdout).toContain(`${line}\n`)
    }
  })

  it('puts the keyword length and the keyword first', () => {
    const result = runCli([
      'period',
      'CHREEVOAHMAERATBIAXXWTNXBEEOPHBSBQMQEQERBWRVXUOAKXAOSXXWEAHBWGJMMQMNKGRFVGXWTRZXWIAKLXFPSKAUTEMNDCMGTSXMXBTUIADNGMGPSRELXNJELXVRVPRTULHDNQWTWDTYGBPHXTFALJHASVBFXNGLLCHRZBWELEKMSJIKNBHWRJGNMGJSGLXFEYPHAGNRBIEQJTAMRVLCRREMNDGLXRRIMGNSNRWCHRQHAEYEVTAQEBBIPEEWEVKAKOEWADREMXMTBHHCHRTKDNVRZCHRCLQOHPWQAIIWXNRMGWOIIFKEE',
    ])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('\n  length  5  IoC 0.0666  key JANET\n')
  })

  it('ranks the families with the call to try next', () => {
    const result = runCli(['guess', 'FMXVEDKAPHFERBNDKRXRSREFMORUDSDKDVSHVUFEDKAPRKDLYEVLRHHRH'])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain(
      '\n1. substitution-multiplicative, substitution-shift, substitution-reflection (medium): affine, caesar, atbash\n',
    )
    expect(result.stdout).toContain('Next: ciphers_decode with cipher affine and a=3, b=5.\n')
  })

  it('puts the best fit of --lang first', () => {
    const polish = 'OLWZR RMFCBCQR PRMD WB MHVWHV MDN CGURZLH'

    expect(runCli(['brute', 'DWWDFN DW GDZQ']).stdout).toMatch(/^shift= 3 -> ATTACK AT DAWN\n/u)
    expect(runCli(['brute', polish, '--lang', 'pl']).stdout).toMatch(
      /^shift= 3 -> LITWO OJCZYZNO MOJA TY JESTES JAK ZDROWIE\n/u,
    )
    expect(runCli(['brute', polish]).stdout).not.toMatch(/^shift= 3 -> LITWO/u)
  })

  it('takes the ciphertexts of a crib drag as one JSON array', () => {
    const ciphertexts = [
      '315c4eeaa8b5f8aaf9174145bf43e1784b8fa00dc71d885a804e5ee9',
      '32510ba9babebbbefd001547a810e67149caee11d945cd7fc81a05e9',
    ]
    const result = runCli([
      'crib',
      JSON.stringify(ciphertexts),
      '--crib',
      'The secret',
      '--known',
      '[{"message":1,"offset":0,"text":"The"}]',
    ])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('\n1. #1 at 0 (score -3.35): #0 "We can fac"\n')
    expect(result.stdout).toContain(`Key (?? unknown): 66396e${'??'.repeat(25)}\n`)
  })

  it('ranks the hidden readings and reads one pick alone', () => {
    const telegram =
      "PRESIDENT'S EMBARGO RULING SHOULD HAVE IMMEDIATE NOTICE. GRAVE SITUATION AFFECTING INTERNATIONAL LAW. STATEMENT FORESHADOWS RUIN OF MANY NEUTRALS. YELLOW JOURNALS UNIFYING NATIONAL EXCITEMENT IMMENSELY."

    expect(runCli(['hidden', telegram]).stdout).toContain(
      '\n   0.19  pick=word letter=1 -> PERSHINGSAILSFROMNYJUNEI\n',
    )
    expect(runCli(['hidden', 'one two three', '--pick', 'word', '--letter', '-1']).stdout).toBe(
      'eoe\n',
    )
  })

  it('recovers a Vigenère key from the text encode wrote', () => {
    const plain =
      'To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler.'
    const encoded = runCli(['encode', 'vigenere', plain, '--key', 'WATSON']).stdout.trim()
    const result = runCli(['recover', encoded, '--cipher', 'vigenere', '--limit', '1'])

    expect(result.status).toBe(0)
    expect(result.stdout).toContain(`\n1. key WATSON, fit -9.64: "${plain}"\n`)
  })
})

describe('CLI dashed text and stdin', () => {
  it('reads Morse that starts with a dash as is, after -- or from stdin', () => {
    expect(runCli(['decode', 'morse', '-.-. .- -']).stdout).toBe('CAT\n')
    expect(runCli(['decode', 'morse', '--', '-.-. .- -']).stdout).toBe('CAT\n')
    expect(runCli(['decode', 'morse', '-'], { input: '-.-. .- -\n' }).stdout).toBe('CAT\n')
  })

  it('reads the book of a book cipher from stdin', () => {
    const result = runCli(['decode', 'book', '1 2 3', '--book', '-'], {
      input: 'The quick brown fox\njumps over\n',
    })

    expect(result.stdout).toBe('The quick brown\n')
  })

  it('opens armor that starts with dashes as an argument or from stdin', () => {
    const armor = runCli(['encode', 'openpgp', 'hello', '--key', 'pw', '--count', '1024']).stdout

    expect(armor).toMatch(/^-----BEGIN PGP MESSAGE-----\n/u)
    expect(runCli(['decode', 'openpgp', armor, '--key', 'pw']).stdout).toBe('hello\n')
    expect(runCli(['decode', 'openpgp', '-', '--key', 'pw'], { input: armor }).stdout).toBe(
      'hello\n',
    )
  })
})

describe('CLI closed stdout', () => {
  it.each([['ciphers'], ['brute', 'KHOOR ZRUOG']])(
    'ends `%s` quietly when the reader goes away',
    async (...args) => {
      const child = spawn(process.execPath, [cliPath, ...args], {
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

    expect(runCli(['encode', 'columnar', 'ABCDEF', '--key', key], { env }).stdout).toBe('ACEBDF\n')
    expect(runCli(['decode', 'columnar', 'ACEBDF', '--key', key], { env }).stdout).toBe('ABCDEF\n')
    expect(
      runCli(['encode', 'adfgvx', 'HELLO', '--key', 'KEY', '--transposition', key], { env }).stdout,
    ).toBe(runCli(['encode', 'adfgvx', 'HELLO', '--key', 'KEY', '--transposition', 'AB']).stdout)
  })
})
