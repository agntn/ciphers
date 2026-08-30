import { describe, expect, it } from 'vite-plus/test'
import { renderToolResult } from '../../packages/shared/tui'

const ESC = String.fromCodePoint(27)
const NUL = String.fromCodePoint(0)
const BEL = String.fromCodePoint(7)

/** `fg` is optional on the theme, so a bare object has to render too. */
const plain = {}

/** Mark the colour a line was painted with, so the tests can read it back. */
const tagged = { fg: (color: string, text: string) => `<${color}>${text}` }

function textResult(...lines: readonly string[]) {
  return { content: [{ type: 'text', text: lines.join('\n') }] }
}

function bruteResult(width: number) {
  const lines = []
  for (let shift = 1; shift <= 25; shift++) {
    lines.push(`shift=${String(shift).padStart(2)} -> ${'a'.repeat(width)}`)
  }
  return textResult(...lines)
}

describe('collapsed previews', () => {
  it('cuts a long cipher result to the preview width', () => {
    const rendered = renderToolResult(textResult('x'.repeat(10_000)), {}, plain)

    expect(rendered).toHaveLength(200)
    expect(rendered.endsWith('…')).toBe(true)
  })

  it('leaves a result that already fits alone', () => {
    expect(renderToolResult(textResult('KHOOR ZRUOG'), {}, plain)).toBe('KHOOR ZRUOG')
  })

  it('shows ten of the 25 brute-force lines and counts the rest', () => {
    const lines = renderToolResult(bruteResult(2_000), {}, plain).split('\n')

    expect(lines).toHaveLength(11)
    expect(lines[0]?.startsWith('shift= 1 -> ')).toBe(true)
    expect(lines[9]?.startsWith('shift=10 -> ')).toBe(true)
    expect(lines[10]).toBe('… 15 more lines')
    for (const line of lines.slice(0, 10)) expect(line).toHaveLength(200)
  })

  it('paints the output and the hidden-line count differently', () => {
    const lines = renderToolResult(bruteResult(4), {}, tagged).split('\n')

    expect(lines[0]).toBe('<toolOutput>shift= 1 -> aaaa')
    expect(lines[10]).toBe('<muted>… 15 more lines')
  })
})

describe('expanded results', () => {
  it('keeps the complete text of every line', () => {
    const lines = renderToolResult(bruteResult(2_000), { expanded: true }, plain).split('\n')

    expect(lines).toHaveLength(25)
    for (const line of lines) expect(line).toHaveLength(2_012)
  })

  it('keeps a ciphertext longer than the collapsed scan width', () => {
    const cipherText = 'x'.repeat(10_000)

    expect(renderToolResult(textResult(cipherText), { expanded: true }, plain)).toBe(cipherText)
  })
})

describe('untrusted cipher text', () => {
  it('strips the terminal control bytes a preserved non-letter carries through', () => {
    const rendered = renderToolResult(
      textResult(`${ESC}[31mred${ESC}]0;title${BEL}${NUL}text`),
      {},
      plain,
    )

    expect(rendered).toBe('red text')
  })

  it('strips them in the expanded view as well', () => {
    const rendered = renderToolResult(textResult(`${ESC}[31mred`), { expanded: true }, plain)

    expect(rendered).toBe('red')
  })

  it('cuts before a surrogate pair rather than through it', () => {
    const rendered = renderToolResult(textResult(`${'a'.repeat(198)}😀tail`), {}, plain)

    expect(rendered).toBe(`${'a'.repeat(198)}…`)
  })
})

describe('result shapes', () => {
  it('renders nothing for a result with no text', () => {
    expect(renderToolResult({ content: [] }, {}, plain)).toBe('')
    expect(renderToolResult({}, {}, plain)).toBe('')
  })

  it('keeps the trailing spaces a cipher carried over from its input', () => {
    const spaced = 'DWWDFN DW GDZQ  '

    expect(renderToolResult(textResult(spaced), { expanded: true }, plain)).toBe(spaced)
    expect(renderToolResult(textResult(spaced), {}, plain)).toBe(spaced)
  })

  it('skips content parts that carry no text', () => {
    const result = {
      content: [{ type: 'image', data: 'AAAA' }, { type: 'text', text: 'KHOOR' }, null],
    }

    expect(renderToolResult(result, {}, plain)).toBe('KHOOR')
  })
})
