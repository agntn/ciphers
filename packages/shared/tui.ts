import { stripVTControlCharacters } from 'node:util'

/**
 * Collapsed result previews shared by the Pi and OMP wrappers.
 *
 * Without a result renderer both harnesses hand the whole tool output to one
 * Text component, which wraps every line in full. Cipher output is the shape
 * that hurts: encode and decode return a single line as long as the input
 * allows, and Caesar brute force returns 25 of them. The collapsed view then
 * wraps thousands of characters nobody reads before the user expands anything.
 *
 * These renderers cut the preview to a fixed depth and width, count what they
 * left out, and hand back the full text once the row is expanded. Each wrapper
 * adapts its own renderer signature and calls in here, so both surfaces read
 * the same.
 */

/**
 * The part of the harness theme these renderers touch. `fg` is optional: a
 * harness may hand a renderer a bare object, and unstyled output still has to
 * read correctly.
 */
export interface OutputTheme {
  fg?(color: string, text: string): string
}

/** View state of the result row, as both harnesses report it. */
export interface RenderOptions {
  expanded?: boolean
}

/**
 * A tool result as the harness hands it back to the renderer.
 *
 * `content` stays untyped because a harness models it as a union of text and
 * image parts, and an image part shares no field with a text one.
 */
export interface RenderedToolResult {
  content?: ReadonlyArray<unknown>
}

/** Lines the collapsed preview shows before it counts the rest. */
const COLLAPSED_BODY_LINES = 10

/** Width one collapsed line gets before it is cut. */
const PREVIEW_LINE_WIDTH = 200

/**
 * Text scanned per collapsed line. Sanitizing only shortens a line, so a lead
 * this much wider than the preview still fills it, and a 10 000-character
 * ciphertext is never scanned whole for a 200-character preview.
 */
const COLLAPSED_SCAN_WIDTH = 2048

/** C0 and C1 bytes, which drive the terminal rather than print in it. */
// oxlint-disable-next-line no-control-regex
const CONTROL_BYTES = /[\u0000-\u001F\u007F-\u009F]/g

/**
 * Cut `text` to `end` code units without splitting a surrogate pair.
 *
 * Half a pair is not a character the terminal can measure or print, so a cut
 * landing inside one gives back the code unit before it.
 */
function cutAt(text: string, end: number): string {
  const last = text.charCodeAt(end - 1)
  return text.slice(0, last >= 0xd800 && last <= 0xdbff ? end - 1 : end)
}

/**
 * Strip everything that would drive the terminal instead of describing the
 * result. Cipher text crosses a trust boundary twice: the model chooses the
 * input, and a cipher that preserves non-letters carries whatever it was given
 * straight into the output. Both harness fallbacks sanitize before printing,
 * and a renderer replacing one has to do the same.
 */
function sanitize(text: string): string {
  return stripVTControlCharacters(text.toWellFormed()).replace(CONTROL_BYTES, ' ')
}

/** Cut one preview line to `max`, marking that the rest is still there. */
function clip(text: string, max: number): string {
  return text.length <= max ? text : `${cutAt(text, max - 1)}…`
}

/** Sanitize one line of a collapsed preview and fit it to the preview width. */
function previewLine(line: string): string {
  const lead = line.length > COLLAPSED_SCAN_WIDTH ? cutAt(line, COLLAPSED_SCAN_WIDTH) : line
  return clip(sanitize(lead), PREVIEW_LINE_WIDTH)
}

/**
 * Walk `body` line by line, materializing at most `max` of them.
 *
 * Brute force returns 25 lines where the collapsed view shows ten, and a
 * renderer reruns on every streamed delta, so the hidden lines are counted
 * rather than allocated.
 */
function takeLines(body: string, max: number): { lines: string[]; hidden: number } {
  const lines: string[] = []
  let hidden = 0
  let cursor = 0

  while (cursor <= body.length) {
    const breakAt = body.indexOf('\n', cursor)
    const end = breakAt === -1 ? body.length : breakAt
    if (lines.length < max) lines.push(body.slice(cursor, end))
    else hidden++
    if (breakAt === -1) break
    cursor = breakAt + 1
  }

  return { lines, hidden }
}

/**
 * Join the text the tool returned, skipping parts that carry no text.
 *
 * Trailing whitespace is part of the result, not noise around it. A cipher that
 * preserves non-letters carries the spaces at the end of its input straight
 * through, so the renderer hands the text on exactly as the cipher produced it.
 */
function resultText(result: RenderedToolResult): string {
  const parts: string[] = []
  for (const part of result.content ?? []) {
    if (typeof part !== 'object' || part === null) continue
    const text = Reflect.get(part, 'text')
    if (typeof text === 'string') parts.push(text)
  }
  return parts.join('\n')
}

/**
 * Render a finished cipher result: a bounded preview while the row is
 * collapsed, the complete text once it is expanded.
 */
export function renderToolResult(
  result: RenderedToolResult,
  options: RenderOptions,
  theme: OutputTheme,
): string {
  const body = resultText(result)
  if (body.length === 0) return ''

  const paint = (color: string, text: string) => (theme.fg ? theme.fg(color, text) : text)
  const expanded = options.expanded === true
  const { lines, hidden } = takeLines(
    body,
    expanded ? Number.POSITIVE_INFINITY : COLLAPSED_BODY_LINES,
  )

  const rendered = lines.map((line) =>
    paint('toolOutput', expanded ? sanitize(line) : previewLine(line)),
  )
  if (hidden > 0) rendered.push(paint('muted', `… ${hidden} more lines`))

  return rendered.join('\n')
}
