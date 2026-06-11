---
title: Figma Compatibility
description: How and why Inkly can read and write Figma's `.fig` binary format without official documentation — Kiwi schema origins, reverse engineering background, legal context, and sustainability strategy.
---

# Figma Compatibility

Inkly reads and writes Figma's `.fig` binary format natively. Figma has never published the file format specification publicly. This document explains how that works, why it's legal-ish, and what happens when Figma changes the schema.

For the implementation-level details of the binary layout, see [File Format](./file-format).

## TL;DR

| Question | Answer |
|---|---|
| Is `.fig` specification public? | **No.** Figma has never published it. |
| Then how does Inkly support it? | The Kiwi serialization language Figma uses *is* public (Evan Wallace's OSS project). The actual field definitions are extracted from the Figma desktop app by the open-source community. |
| Is this legal? | **Grey area.** Reverse engineering for interoperability is allowed in many jurisdictions (US DMCA §1201(f), EU Directive 2009/24/EC), but it violates Figma's Terms of Service. No precedent of Figma suing an OSS project over `.fig` interop. |
| What if Figma changes the format? | Inkly's `fig.kiwi` needs manual re-extraction. There is no automatic update path. |

## Background — what isn't public

Figma stores documents as a binary blob. The binary is:

1. A **ZIP container** with a magic header, version, schema bytes, and a payload.
2. The payload is a **Kiwi-serialized** `NodeChange[]` array — every node in the document encoded as a tagged binary field set.
3. Compressed with **Zstd** (or deflate as fallback).

Figma has published **none** of:

- The Kiwi schema for `NodeChange` (~390 fields, ~194 message types)
- The complete enum values (e.g. `NodeType.SECTION = 32`, `BlendMode.MULTIPLY = 5`)
- The blob substructure (image refs, vector networks, font fallbacks)
- The schema versioning policy

What Figma *has* published, intentionally or otherwise:

- The **Kiwi language** itself ([github.com/evanw/kiwi](https://github.com/evanw/kiwi), MIT, by Figma's co-founder)
- The **Plugin API** TypeScript definitions (the runtime shape of nodes, public Web API)
- The **Multiplayer protocol** message types (observable on the wire when the desktop app connects to `figma.com`)

The gap between "Kiwi language is public" and "the schema *for `.fig`* is not" is exactly what the OSS community has filled.

## Layer 1 — Kiwi schema language (public)

Kiwi is a protobuf-like binary serialization DSL designed by Evan Wallace (Figma co-founder) in 2017. It's published under MIT at [github.com/evanw/kiwi](https://github.com/evanw/kiwi).

```kiwi
struct Color {
  float r;
  float g;
  float b;
  float a;
}

message NodeChange {
  GUID guid = 1;
  NodeType type = 4;
  string name = 5;
  // ... many more fields, each with a numeric tag
}
```

Inkly bundles a TypeScript reimplementation of Kiwi at `packages/core/src/kiwi/schema-runtime/`. It's not a direct copy — it adds patches for ESM modules, sparse field IDs (Figma uses tag numbers like 318 and 399 mixed with low ones), and browser compatibility.

This layer is **fully open**: anyone can write a Kiwi schema and use it to encode/decode messages. The Figma-specific knowledge is in the schema *content*, not the language.

## Layer 2 — `fig.kiwi` (community-extracted)

`packages/core/src/kiwi/fig/codec/schema/fig.kiwi` is a 5,623-line file. It defines:

- 24 message types (`JOIN_START`, `NODE_CHANGES`, `STYLE`, ...)
- ~194 struct / message definitions including `NodeChange`, `BlobReference`, `ParentIndex`, `LibraryMoveInfo`, `SharedStyleMasterData`, ...
- ~390 fields on `NodeChange` alone (covering all node properties: layout, fills, strokes, effects, components, variables, animations, slides, ...)
- Dozens of enums (`NodeType`, `BlendMode`, `StrokeAlign`, `TextAutoResize`, `LayoutGridPattern`, ...)

Figma did not publish this file. The OSS community extracted it through three main channels.

### Channel A — Desktop app binary

Figma's desktop client (Electron) bundles the Kiwi schema as binary data in its JavaScript. Specifically:

- The schema bytes are passed to `compileSchema()` at startup
- They can be intercepted by patching the bundled JS
- Once you have the binary, `encodeBinarySchema` has an inverse (`decodeBinarySchema`) that produces a `Schema` object
- A printer can serialize the `Schema` back to `.kiwi` DSL text

This is the most reliable channel because it gives the schema *exactly as Figma uses it*.

### Channel B — Multiplayer protocol observation

Figma's collaborative editing uses a WebSocket protocol at `multiplayer.figma.com`. When a client connects:

- The server sends a `JOIN_START` message that includes the Kiwi schema bytes (so clients can stay schema-compatible across versions)
- Captured network traffic + the schema bytes from `JOIN_START` reveals the current schema

This channel exposes the schema even without touching Figma's binaries.

### Channel C — Prior OSS projects

Several OSS projects have already done the extraction work:

- [**Penpot**](https://penpot.app) — alternative design tool, imports `.fig` files
- [**dannote/figma-use**](https://github.com/dannote/figma-use) — read/write automation via CDP (now blocked since Figma 126)
- [**figma-decoder**](https://github.com/) projects in various languages
- [**Penpot's .fig import**](https://github.com/penpot/penpot/tree/develop/common/src/app/common/files/migrations) — open source

Inkly's `fig.kiwi` is a curated merge of these sources plus periodic re-extraction from the latest Figma desktop release.

## Layer 3 — `.pen` format (Inkly-native)

By contrast, the `.pen` format is Inkly's own creation, so no reverse engineering is involved.

`packages/core/src/io/formats/pen/convert.ts` defines:

```ts
export interface PenDocument {
  version: string
  children: PenNode[]
  themes?: Record<string, string[]>
  variables?: Record<string, PenVariable>
}

export interface PenNode {
  type: string
  id: string
  name?: string
  x?: number
  y?: number
  width?: number | string
  fill?: PenFill
  stroke?: PenStroke
  cornerRadius?: number | string | (number | string)[]
  layout?: string
  children?: PenNode[]
  content?: string                  // TEXT node text
  // ... dozens of optional fields
}
```

Read is `JSON.parse(text)`, write is `JSON.stringify(doc)`. No binary, no schema language, no obscurity. The trade-off is that `.pen` files are larger than `.fig` (text vs binary), but they're trivially diffable, mergeable, and inspectable.

## Legal context

Reverse engineering for interoperability sits in a grey zone that has been litigated multiple times in software history.

| Jurisdiction | Position |
|---|---|
| **US** | DMCA §1201(f) explicitly allows reverse engineering for interoperability with other programs. Reinforced by *Sega v. Accolade* (9th Cir. 1992) and *Sony v. Connectix* (9th Cir. 2000). |
| **EU** | Directive 2009/24/EC Art. 6 (Decompilation) permits reverse engineering for interoperability. |
| **Japan** | 著作権法第30条の4 + 第47条の4 allow analysis necessary for interoperability. |

Figma's Terms of Service, however, prohibit reverse engineering. Violating a contract is **not the same as violating the law** — it's a civil matter, not criminal. The realistic worst case is account termination on `figma.com`, not legal action.

Track record so far:

- Penpot has imported `.fig` files for years. Figma has not taken legal action.
- `dannote/figma-use` operated openly on GitHub. Figma did not sue — they patched the CDP attack surface in Figma desktop 126 instead.
- No OSS `.fig` reader has been DMCA-takedown'd to date.

Inkly takes the position that interoperability is in users' interest, that the Kiwi language is already public, and that schema extraction qualifies as fair-use reverse engineering for interoperability. Users assume their own risk when reading Figma files with Inkly.

## Sustainability — what happens when Figma changes the schema

There is no automatic update path. The `fig.kiwi` file is a snapshot, and Figma's schema evolves:

- **New node types** are added (Slides, FigJam shapes, animations)
- **Fields are added** to existing messages with new tag numbers
- **Enums grow** as new options ship (new blend modes, text decorations)
- **Compression may change** (Zstd parameters, container format tweaks)

Because Kiwi is tag-numbered, additions are backwards-compatible — old readers ignore unknown tags. So a stale `fig.kiwi`:

- Will still **open** newer files (unknown fields are dropped)
- May **lose data** on round-trip (unknown fields aren't preserved)
- Will **fail outright** only if the magic header or message-type enum changes

The maintenance burden is:

1. Periodically re-extract the schema from the latest Figma desktop release
2. Diff against the current `fig.kiwi` to spot new fields
3. Test round-trip on sample files
4. Update the import/export pipeline (`packages/core/src/io/formats/fig/`) to handle new node types

In practice, this is done ad-hoc when issues are reported, not on a fixed cadence.

## Related projects

| Project | Approach | Status |
|---|---|---|
| [Penpot](https://penpot.app) | OSS design tool, imports `.fig` via its own extractor | Active |
| [dannote/figma-use](https://github.com/dannote/figma-use) | CDP-based automation (read/write live Figma) | Blocked by Figma 126 (CDP removed) |
| [Figma Plugin API](https://www.figma.com/plugin-docs/) | Official, but only runs *inside* Figma | Official, limited |
| [Figma MCP server](https://github.com/figma/code-connect) | Official, read-only | Official, limited |
| **Inkly** | Native `.fig` read/write via reimplemented Kiwi + curated schema | OSS (MIT), this project |

## Summary

`.fig` interoperability works because:

1. **Kiwi is public** (Evan Wallace, MIT). The serialization mechanism is open.
2. **The schema is extractable**, though not officially published. The community has built tools to extract it from the Figma desktop app and from multiplayer traffic.
3. **Reverse engineering for interoperability is legal in major jurisdictions**, even though it violates Figma's ToS.
4. **Tag-numbered fields make schemas forward-compatible**, so a slightly stale extraction keeps working for most files.

Inkly's value isn't "we cracked Figma" — it's "we curated and maintained a usable extraction so OSS-side users don't have to do this work themselves."

## See also

- [File Format](./file-format) — binary layout of `.fig` and the import/export pipeline
- [Scene Graph](./scene-graph) — the in-memory representation that both `.fig` and `.pen` decode into
- [Node Types](./node-types) — the runtime node types and their relationship to the `.fig` `NodeType` enum
- [Kiwi schema language](https://github.com/evanw/kiwi) (external) — the serialization DSL Figma uses
