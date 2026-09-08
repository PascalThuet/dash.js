I completed the comparison requested by @dsilhavy against `bcp-47-normalize@2.3.0`, the version locked in dash.js 5.0.0 and immediately before #4970. The audit uses the same dependency versions and npm integrity hashes, comparing 5.2.0 and the current #5120 implementation (`87670d1`).

The two mappings in #5120 only restore the reported examples. Other differences remain across several categories:

| Input | Previous `bcp-47-normalize` | Current #5120 |
|---|---|---|
| `iw` / `in` / `ji` | `he` / `id` / `yi` | unchanged |
| `sh` | `sr-Latn` | `sh` |
| `cmn` / `arb` / `swh` | `zh` / `ar` / `sw` | unchanged |
| `tgl` / `twi` | `fil` / `ak` | `tl` / `tw` |
| `i-klingon` / `sgn-BE-FR` | `tlh` / `sfb` | unchanged |
| `en-US` / `fr-FR` / `pt-BR` | `en` / `fr` / `pt` | unchanged |
| `sr-Cyrl` | `sr` | `sr-Cyrl` |
| `zh-Hans` / `zh-Hant` | `zh` / `zh-TW` | unchanged |
| `en-840` / `en-UK` | `en` / `en-GB` | unchanged |
| `en-Qaai` / `el-polytoni` | `en-Zinh` / `el-polyton` | unchanged |

In the table, “unchanged” means that the input tag is preserved.

The old implementation combines parser-level historical-tag normalization, language/compound-tag aliases, field aliases, CLDR likely-subtag minimization, and variant/extension ordering. In particular, `nl-NL → nl` is part of general minimization, not an isolated language alias. Non-default regions are not simply removed: `pt-PT` remains `pt-PT`.

I scanned all 462 `matches` rules, 320 `fields` rules, 8,034 `likely` entries, and 26 parser historical-tag entries. Direct source-tag probes differ for 262/462 `matches` entries before this PR and 261/462 afterward. All 320 field-rule probes in a private-language context remain different. Of the 202 existing ISO conversion entries, 200 reproduce the old output for the isolated code; `tgl` and `twi` are the two exceptions.

The comparison corpus contains 32,390 distinct inputs, generated from those tables, language/script/region projections, upstream fixtures and targeted cases. There are 23,904 output differences before this PR and 23,896 afterward. The eight restored inputs are variations of the two targeted cases. These are synthetic coverage counts, not a production impact estimate or an exhaustive enumeration of every possible BCP 47 tag. The 89 upstream fixtures pass against the old package; 57 still differ with this PR.

The exact-tag mappings also do not compose with suffixes: `zh-cmn-Hans-CN` previously became `zh`, and `nl-NL-x-audit` became `nl-x-audit`; both remain unchanged with #5120. There are additional formatting differences, such as `en-u-ca-gregory` becoming `en-u-CA-gregory` because the lightweight helper infers subtag roles from length.

I also need to qualify the PR description about preserving language-selection behavior. The directional filtering algorithm is unchanged, but normalization changes its inputs and therefore some matches. For example, preference `nl-NL` matches a `nl-BE` track with the old library, does not match in 5.2.0, and matches again with this PR because the preference becomes `nl`.

Regarding @stschr's example, the old normalizer already collapsed both `en-US` and `en` to `en`. A preference originally set to `en-US` would consequently also match `en-GB`. Restoring that normalization alone will not implement exact-region prioritization; selection needs access to the relevant region/script information and a ranking policy across the available tracks. Script handling also changes real matches: preference `zh-Hant` matches a `zh-TW` track with the old pipeline but not the new one.

These checks isolate the language predicate after MPD language normalization. They do not determine the final selected track: the existing settings filter restores its input list when no tracks match, and other selection criteria still apply.

Before I extend #5120, could you confirm which compatibility contract we should target?

1. Exact compatibility with the previous 2.3.0 outputs, including CLDR minimization and historical behavior such as `und → en`.
2. A deliberately narrower normalization contract, with the supported aliases and intentional differences documented and tested.

I propose specifying the track-ranking policy as a separate follow-up: exact match, generic-language fallback, other-region fallback, script handling, and interactions with the other track preferences. This would retain the information needed for exact matches. Please also confirm whether this split is appropriate. The current two-mapping patch does not settle either design decision.

Validation: all six upstream tests passed (including the 89-fixture test), plus 45 source-extracted language-predicate checks and 18 parser-converter checks across the three implementations. No full-player playback or bundle-size validation was performed for this audit.
