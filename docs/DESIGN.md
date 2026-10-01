# Design system

The shared rules (direction, color roles, type, the `console-*` grammar, hero, docs chrome, density, motion, checks) live in the one agntn design system document, kept with the agntn skills until it ships in the shared package. This file records only what ciphers owns and where it departs from the shared rules. It does not repeat them.

The instruments ciphers owns:

| Instrument | Where | Object |
| --- | --- | --- |
| [LandingHero.vue](app/components/content/LandingHero.vue) | landing, first screen | hero zone, circuit `encode` into the tape |
| [LandingTape.vue](app/components/content/LandingTape.vue) | under the hero | one sample sentence through one cipher, plaintext and ciphertext as two tapes |
| [LandingRotatingCode.vue](app/components/content/LandingRotatingCode.vue) | "Same two methods, every cipher" | `create`, `encode` and `decode` for the sample, as a file |
| [LandingBrute.vue](app/components/content/LandingBrute.vue) | "Twenty-five shifts, best fit on top" | verdict console: the sample as a Caesar, the key's rank among the 25 shifts |
| [LandingFrequency.vue](app/components/content/LandingFrequency.vue) | "Count letters before guessing a key" | `analyzeFrequency` over the sample's ciphertext, IC and histogram |
| [CipherHistogram.vue](app/components/CipherHistogram.vue) | frequency panel and playground | 26 columns A to Z, the language's top six in the accent |
| [LandingRegistry.vue](app/components/content/LandingRegistry.vue) | "Forty-three ciphers, thirteen families" | the registry as a grid of cells, one band per category, the walk's cipher and its family on the nodes |
| [CipherRoster.vue](app/components/content/CipherRoster.vue) | `/ciphers`, `/ciphers/classical`, `/ciphers/block` | roster of the registry on `UTable`, sortable |
| [LandingToolCall.vue](app/components/content/LandingToolCall.vue) | "`<count>` tools, three hosts" | one `ciphers_info` call, full text in the dialog |
| [LandingCustom.vue](app/components/content/LandingCustom.vue) | "Extend Cipher, call register" | `reverse.ts`, a custom cipher as a file |
| [LandingStart.vue](app/components/content/LandingStart.vue) | closing section | install, notes, first call as a file |
| [CipherFacts.vue](app/components/content/CipherFacts.vue) | every cipher page (`::cipher-facts`) | cipher dossier: ID bar with position, reticle, readout, options, access |
| [CiphersPlayground.vue](app/components/content/CiphersPlayground.vue) | `/playground` under the hero zone | request and response instruments for the agent tools |
| [Landing.takumi.vue](app/components/OgImage/Landing.takumi.vue), [Docs.takumi.vue](app/components/OgImage/Docs.takumi.vue) | OG images | the hero zone in 1200 by 600; a docs page as one instrument, a cipher page with its blurb, family and keyspace, `create()` and the options as chips |

Labels, families, categories, options and keyspaces come from `create(name).info()` through [ciphers.ts](app/utils/ciphers.ts); icons, blurbs and sample sentences live there too. Every tool text comes from `src/tool-operations.ts` itself through [tools.ts](app/utils/tools.ts), the same executors the MCP server runs, so nothing is mirrored.

## Anatomy

- **Tape.** Bar `Call encode("<name>", "<sample>", …)` with the whole call in the tooltip, meta `<family> · 05 / 40`. The subject band's left column holds the cipher (reticle, `Cipher / <category>`, label, blurb; every sample's name block hidden in the same cell, so the band keeps one height) and under it the wiring: rule `Wiring [ which letters fix which output ]`, an `In` tape with one boxed cell per character, an `Out` tape with one per character or, for a block cipher, one per byte of hex, and between them the wires [wiring.ts](app/utils/wiring.ts) measures with the library. A transposition encodes a private marker per character and its wires cross; everything else encodes growing prefixes, so a substitution runs straight down, Morse and Bacon fan out through a node, Playfair joins pairs, ECB and CBC gather a whole block on a bus, CTR goes byte by byte and a CCM or OCB tag takes a bus from every letter. Hovering a cell lights its group. Readout: options, keyspace cut to its figure, the wiring in words, round trip in the accent (a reshaping cipher shows what comes back, muted), a tick per registered cipher with the sample's family open. Footer: link to the cipher page, previous and next.
- **Brute force.** Bar `Call ciphers brute "<ciphertext>"`. Subject: `Verdict / caesar`, `shift 3 ranked 1st` and one sentence on why it landed there. Readout: the three best fits, the key's row on the accent edge, then a tick per shift in shift order with the key open. `03 Full tool response` is the `ciphers_caesar_brute` text.
- **Frequency.** Bar `Call analyzeFrequency(<name> output, "en")`. Subject: `Counts / <name>`, `IC 0.0xx` in the accent, one sentence saying which reference it sits closer to. Band `Histogram [ A to Z, English top six marked ]`. Footer names both references, read from the library.
- **Cipher dossier.** ID bar with the name and `05 / 40`, meta `<category> · <family>`. Subject: reticle, `Cipher / <family>`, label, blurb. Readout: keyspace in the accent, decode, what it works on, family size; a tick per option, required open. Bands `Options [ as info() declares them ]` (name, type, required or default, description) and `Access [ library · CLI · playground ]` as leads with a `Kin` lead to the rest of the family, then `03 Full tool response` with the `ciphers_info` text.
- **Registry.** Bar `Call ciphers()`, meta the count per category. One band per category under a rule title with its size, then a cell per cipher (glyph, name, node): the cipher the panels show now a filled node on an accent edge, the rest of its family an accent outlined node, everything else quiet. Each cell has a `UTooltip` with family and options and links to its page. Footer: legend of the two nodes, a link to the full roster.
- **Roster.** Columns cipher (glyph, label, boxed name), category (dropped when the roster shows one), family, options (required bright, optional with `?`), keyspace behind a leader, the whole sentence in the tooltip.
- **Playground.** Request: the tools as leads, fields as `USelectMenu`, `UTextarea` and `UInput` with variant `none` in the readout, the case flags only for a classical cipher, one chip per cipher as `UButton` variant `chip`, CLI and tool JSON with copy. Response: a subject band per answer kind (encoded or decoded with the output as a value, 25 ranked rows for brute force, histogram for frequency, ranked key lengths with a decode button for period, options for info, error), `03 Full tool response`, footer to the cipher page and the guide.

## Motion

| Change | Motion |
| --- | --- |
| landing sample advances (4.2 s, paused on hover and focus) | ruler cursor once, scan and reticle arcs, readout rows slide in, output cells drop in 12 ms apart, wires draw once, file name rolls, circuit runs once |
| frequency on a new sample | histogram columns grow once from the bottom |
| playground answer changes | cursor and scan once per answer text, not per keystroke that changes nothing |
| reduced motion | no walk; manual previous and next still work |

## Differences

Departures from the shared rules, recorded for the shared package:

- The hero instrument is a tape with its wiring, not a record dossier: the domain is text going through a cipher, so the first screen shows the plaintext, what the library made of it and which letters decided which output.
- The docs sections split the cipher pages by category: the header tabs are Guide, Classical, Block and Stream, each with its own overview page and its own sidebar, and `/ciphers` stays the overview of all of them as an `All` lead. The pages keep their `/ciphers/<name>` paths, only the menu is regrouped, so it stays short as the registry grows. The landing shows the registry as a grid of cells instead of the roster for the same reason: forty rows were a page, a hundred cells are still a few lines.
- `reverse.ts` next to "Extend Cipher, call register" folds `name`, `info` and `decode` to their signatures the way an editor would, so the file stays as tall as its text; copy hands out the whole file.
- No network call anywhere: every instrument computes in the browser from the library, so no bar says `recorded` or `live`, and every footer that names locality says `no network`.
- The version comes from the root `package.json`; there's no data version, so ID strips and footers carry none.
- The OG images ship local Figtree and Fira Code TTFs, the keys mechanism.
- `public/image.png`, the package image `package.json` points Pi at, is a copy of the built landing OG card. Copy it again from `.output/public/_og/s/` when the hero changes.

## Checks

Beyond the shared checks: `/`, `/ciphers/classical`, `/ciphers/block`, a block cipher page with a long keyspace (`/ciphers/aes-xts`) and `/playground` with a deep link for every tool (`?op=frequency&text=…`, `?op=period&text=…`, `?op=info&cipher=enigma`, a failing `?op=decode&cipher=aes&text=zz&key=00`) at 1440 and 390 px, and no horizontal scroll on `/playground` at 320 px.
