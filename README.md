# BCP 47 compatibility audit — dash.js #5090 / #5120

This branch contains the reproducible audit requested in [issue #5090](https://github.com/Dash-Industry-Forum/dash.js/issues/5090), comparing `bcp-47-normalize@2.3.0` with dash.js 5.2.0 and [PR #5120](https://github.com/Dash-Industry-Forum/dash.js/pull/5120) at `87670d1bcf3a6c4b83bb43cee9e7f87662364b93`.

The two exact-tag mappings restore the reported examples, but broader differences remain in language aliases, historical tags, region/script/variant aliases, CLDR minimization and formatting. Normalization also changes the inputs and results of language filtering. Restoring legacy normalization does not by itself implement exact-region track prioritization.

- [English findings](github-comment.md)
- [Detailed report in French](AUDIT.md)
- [Remaining mapping differences](missing-mappings.md)
- [Summary and source hashes](summary.json)
- [All 32,390 input/output comparisons](results.json)
- [Inventory of every historical table entry and its probes](rule-inventory.json)
- [Language-filter comparisons](matching.json)
- [Verification results](verification.json)
- [Complete audit bundle](audit-bundle.zip)

The corpus is generated from every entry in the historical alias and likely-subtag tables, projections of their language/script/region values, upstream fixtures, and targeted cases. It is not a production frequency estimate or an exhaustive enumeration of all possible BCP 47 tags. Predicate and parser checks execute functions extracted from pinned source snapshots; they are not whole-player playback tests.

## Reproduce

With Node and npm available, run from this directory:

```sh
rtk proxy npm ci --ignore-scripts --no-audit --no-fund
rtk proxy npm test
rtk proxy npm run audit
rtk proxy npm run verify
```

`rtk proxy` is only a command wrapper and may be omitted if RTK is not installed. The original run used Node 25.2.1. Six upstream tests passed, including the 89-fixture test, plus 45 language-predicate checks and 18 parser-converter checks. Package versions and integrity hashes match the dash.js 5.0.0 lockfile.

## Source provenance

- dash.js 5.0.0: `4d23d75e9e9096666afb2c80557d8ccbe1a20cc9`
- dash.js 5.2.0: `4a2d7a93782e544999734410166101a68f8ba079`
- PR base: `cb2640d0a77608f9f438044668947222bc6c2fef`
- PR head: `87670d1bcf3a6c4b83bb43cee9e7f87662364b93`
- upstream normalizer: [wooorm/bcp-47-normalize 2.3.0](https://github.com/wooorm/bcp-47-normalize/tree/2.3.0)

The dash.js snapshots retain their BSD notices. The unchanged upstream test file is covered by [UPSTREAM-LICENSE.txt](UPSTREAM-LICENSE.txt). Installed dependencies are excluded; exact versions are pinned in `package-lock.json`.
