import { stripVTControlCharacters, toUSVString } from 'node:util'

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
  readonly expanded?: boolean
}

/**
 * A tool result as the harness hands it back to the renderer.
 *
 * `content` stays untyped because a harness models it as a union of text and
 * image parts, and an image part shares no field with a text one.
 */
export interface RenderedToolResult {
  readonly content?: ReadonlyArray<unknown>
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
 * Cut a string at a UTF-16 boundary without leaving half a surrogate pair.
 *
 * @param text - String to cut.
 * @param end - Exclusive code-unit boundary.
 * @returns {string} The safe prefix.
 */
function cutAt(text: string, end: number): string {
  const last = text.codePointAt(end - 1)!
  const crossesSurrogatePair = last > 0xffff || (last >= 0xd800 && last <= 0xdbff)
  return text.slice(0, crossesSurrogatePair ? end - 1 : end)
}

/**
 * Remove terminal controls and malformed UTF-16 from untrusted cipher output.
 *
 * @param text - Text crossing into the terminal renderer.
 * @returns {string} Safe printable text.
 */
function sanitize(text: string): string {
  return stripVTControlCharacters(toUSVString(text)).replace(CONTROL_BYTES, ' ')
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${cutAt(text, max - 1)}…`
}

function previewLine(line: string): string {
  const lead = line.length > COLLAPSED_SCAN_WIDTH ? cutAt(line, COLLAPSED_SCAN_WIDTH) : line
  return clip(sanitize(lead), PREVIEW_LINE_WIDTH)
}

/**
 * Materialize a bounded line prefix and count the rest.
 *
 * @param body - Multiline result text.
 * @param max - Maximum lines to retain.
 * @returns {object} Retained lines and the hidden count.
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
 * Join text blocks without trimming cipher output.
 *
 * @param result - Mixed tool content.
 * @returns {string} Joined text blocks.
 */
function resultText(result: Readonly<RenderedToolResult>): string {
  const parts: string[] = []
  for (const part of result.content ?? []) {
    if (typeof part !== 'object' || part === null || !('text' in part)) continue
    if (typeof part.text === 'string') parts.push(part.text)
  }
  return parts.join('\n')
}

/**
 * Render a finished cipher result: a bounded preview while the row is
 * collapsed, the complete text once it is expanded.
 *
 * @param result - Tool result containing text or non-text content blocks.
 * @param options - Current expansion state.
 * @param theme - Optional harness color adapter.
 * @returns {string} Sanitized full output or a bounded preview.
 */
export function renderToolResult(
  result: Readonly<RenderedToolResult>,
  options: Readonly<RenderOptions>,
  theme: Readonly<OutputTheme>,
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
