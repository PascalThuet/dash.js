// Standalone differential audit; no dash.js application files are changed.
import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {bcp47Normalize as legacy} from 'bcp-47-normalize';
import {extendedFilter} from 'bcp-47-match';
import {parse, stringify} from 'bcp-47';
import {matches} from './node_modules/bcp-47-normalize/lib/matches.js';
import {fields} from './node_modules/bcp-47-normalize/lib/fields.js';
import {likely} from './node_modules/bcp-47-normalize/lib/likely.js';
import {many} from './node_modules/bcp-47-normalize/lib/many.js';
import {normal} from './node_modules/bcp-47/lib/normal.js';
import {normalizeBcp47 as baseline, ISO_639_2_TO_1} from './before-pr-5120.mjs';
import {normalizeBcp47 as release} from './v5.2.0.mjs';
import {normalizeBcp47 as proposed} from './pr-5120.mjs';

const corpus = new Map();
function add(tag, family) {
    if (!corpus.has(tag)) corpus.set(tag, new Set());
    corpus.get(tag).add(family);
}

// Every explicit rule is exercised in at least one documented context.
// Some historical CLDR rule strings are not parseable by bcp-47; they remain
// in the inventory and are explicitly marked instead of called valid tags.
for (const rule of matches) {
    for (const tag of [rule.from, rule.to, rule.from + '-x-audit']) add(tag, 'matches');
}
function fieldProbe(rule, language = 'qaa') {
    const field = rule.from.field;
    return stringify({language, [field]: field === 'variants' ? [rule.from.value] : rule.from.value});
}
for (const rule of fields) {
    for (const language of ['qaa', 'en']) add(fieldProbe(rule, language), 'fields');
}
for (const [key, value] of Object.entries(likely)) {
    add(key, 'likely');
    add(value, 'likely');
    const {language, script, region} = parse(value);
    if (language) {
        add(language, 'likely');
        if (script) add(stringify({language, script}), 'likely');
        if (region) add(stringify({language, region}), 'likely');
    }
}
for (const tag of Object.keys(normal)) add(tag, 'parser-normal');
for (const code of Object.keys(ISO_639_2_TO_1)) add(code, 'iso-639');
for (const region of Object.keys(many.region)) add('pap-' + region, 'ambiguous-regions');

// Literal fixture object from the reviewed, pinned upstream test file.
const upstream = readFileSync(new URL('./upstream-test.js', import.meta.url), 'utf8');
const fixtureLiteral = upstream.match(/const fixtures = (\{[\s\S]*?\n  \})/)[1];
const fixtures = vm.runInNewContext('(' + fixtureLiteral + ')', {}, {timeout: 1000});
for (const [input, expected] of Object.entries(fixtures)) {
    assert.equal(legacy(input), expected, 'legacy upstream fixture: ' + input);
    add(input, 'upstream-fixtures');
}
for (const match of upstream.matchAll(/normalize\('([^']*)'/g)) add(match[1], 'upstream-examples');

const examples = [
    'zh-cmn', 'ZH-CMN', 'nl-NL', 'NLD-nl', 'zh-cmn-Hans-CN', 'zh-cmn-Hant',
    'nl-NL-x-audit', 'zh-cmn-x-audit', 'nl-NL-u-ca-gregory', 'zh-cmn-Hans',
    'en-US', 'eng-US', 'en-GB', 'fr-FR', 'fr-CA', 'de-DE', 'pt-BR', 'pt-PT',
    'iw', 'in', 'ji', 'jw', 'mo', 'sh', 'cmn', 'arb', 'swh', 'tl', 'tgl', 'twi',
    'zh-Hant', 'zh-Hans', 'zh-TW', 'zh-Hant-HK', 'sr-Cyrl', 'sr-Latn',
    'en-840', 'en-UK', 'en-Qaai', 'en-BU', 'el-polytoni', 'sv-aaland',
    'sl-rozaj-biske', 'en-b-warble-a-warble', 'und', 'und-Arab', 'und-Hant',
    'EN_US', 'EN-GB-ABCDEFGHI', 'en-u-ca-gregory', 'en-x-ab-LATN',
    'zh-CMN', 'en-Latn-US', 'zh-Hant-TW', 'fre', 'fra', 'eng', 'en',
    'i-klingon', 'sgn-BE-FR', 'zh-yue', 'zh-guoyu', 'de-CH-1901',
    'DE-ch-ROZAJ', 'en-', 'en--US', '*', 'en-*', '', '123', 'constructor',
    '__proto__', 'en-x-ABCD', 'EN-x-foobar', 'en-Latn', 'zh-hans',
    'qaa', 'qaa-Cyrl-ZZ', 'es-419', 'pap-AN'
];
for (const tag of examples) add(tag, 'selected-examples');
// Controlled case probes expose context-free capitalization separately.
for (const tag of [...Object.keys(normal), ...Object.keys(ISO_639_2_TO_1), ...examples]) {
    add(tag.toUpperCase(), 'case-probes');
}

const rows = [...corpus].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([input, families]) => {
    const warnings = [];
    const old = legacy(input, {warning: (...args) => warnings.push(args)});
    // Warnings are not supplied by dash.js; verify they do not change output.
    assert.equal(old, legacy(input));
    const before = baseline(input);
    const version520 = release(input);
    const pr = proposed(input);
    return {
        input, families: [...families].sort(), legacy: old, v520: version520,
        baseline: before, proposed: pr,
        parserAccepts: !!stringify(parse(input)),
        baselineDiffers: old !== before, proposedDiffers: old !== pr,
        caseOnlyBaseline: old !== before && old.toLowerCase() === before.toLowerCase(),
        warnings
    };
});
const byInput = new Map(rows.map(row => [row.input, row]));
function stats(group) {
    return {
        inputs: group.length,
        baselineDifferences: group.filter(x => x.baselineDiffers).length,
        proposedDifferences: group.filter(x => x.proposedDiffers).length,
        baselineCaseOnly: group.filter(x => x.caseOnlyBaseline).length,
        fixedByPR: group.filter(x => x.baselineDiffers && !x.proposedDiffers).length,
        introducedByPR: group.filter(x => !x.baselineDiffers && x.proposedDiffers).length
    };
}
const families = [...new Set(rows.flatMap(row => row.families))].sort();
const isoDifferences = rows.filter(row => row.families.includes('iso-639') && row.baselineDiffers);
assert.deepEqual(isoDifferences.map(x => x.input), ['tgl', 'twi']);
assert.equal(rows.filter(x => x.baseline !== x.v520).length, 0, 'v5.2.0 and PR baseline agree on corpus');
for (const tag of ['zh-cmn', 'nl-NL']) assert.equal(proposed(tag), legacy(tag));
for (const tag of ['zh-cmn-Hans-CN', 'nl-NL-x-audit']) assert.notEqual(proposed(tag), legacy(tag));

// Match after MPD language normalization + LangMatcher's fallback, with a
// string preference and non-empty track. This isolates the actual predicate,
// not the complete player's fallback/selection behavior.
function match(normalize, preference, rawTrack) {
    const track = normalize(rawTrack) || String(rawTrack);
    const range = normalize(preference);
    return {track, range, matches: track !== '' && extendedFilter(track, range).length > 0};
}
const pairs = [
    ['en-US', 'en-US'], ['en-US', 'en'], ['en-US', 'eng'], ['en-US', 'en-GB'],
    ['en-GB', 'en'], ['en', 'en-GB'], ['nl-NL', 'nl-BE'], ['nl-NL', 'nl'],
    ['zh-Hant', 'zh-TW'], ['zh-Hant', 'zh-Hant-HK'], ['zh-Hans', 'zh-CN'],
    ['sr-Cyrl', 'sr'], ['iw', 'he'], ['tgl', 'fil'], ['und', 'en']
];
const matching = pairs.map(([preference, rawTrack]) => ({
    preference, rawTrack,
    legacy: match(legacy, preference, rawTrack),
    baseline: match(baseline, preference, rawTrack),
    proposed: match(proposed, preference, rawTrack)
}));

const ruleInventory = {
    matches: matches.map((rule, index) => ({index, rule, probes: [rule.from, rule.to, rule.from + '-x-audit'].map(x => byInput.get(x))})),
    fields: fields.map((rule, index) => ({index, rule, probes: ['qaa', 'en'].map(language => byInput.get(fieldProbe(rule, language)))})),
    parserNormal: Object.entries(normal).map(([from, to]) => ({from, to, probe: byInput.get(from)})),
    ambiguousRegions: Object.entries(many.region).map(([from, to]) => ({from, to, probe: byInput.get('pap-' + from)})),
    likely: Object.entries(likely).map(([from, to]) => ({from, to, probes: [from, to].map(x => byInput.get(x))}))
};
// Primitive type behavior; not counted in the tag corpus.
const specialInputs = [undefined, null, false, 0, 123, true];
const primitiveBehavior = specialInputs.map(value => ({
    input: String(value), type: typeof value,
    legacy: {value: String(legacy(value)), type: typeof legacy(value)},
    baseline: {value: String(baseline(value)), type: typeof baseline(value)},
    proposed: {value: String(proposed(value)), type: typeof proposed(value)}
}));
const sourceFiles = [
    'before-pr-5120.mjs', 'pr-5120.mjs', 'v5.2.0.mjs', 'upstream-test.js',
    'node_modules/bcp-47-normalize/lib/index.js',
    'node_modules/bcp-47-normalize/lib/matches.js',
    'node_modules/bcp-47-normalize/lib/fields.js',
    'node_modules/bcp-47-normalize/lib/likely.js',
    'node_modules/bcp-47-normalize/lib/many.js',
    'node_modules/bcp-47/lib/parse.js', 'node_modules/bcp-47/lib/normal.js'
];
const summary = {
    auditDate: '2026-09-09', runtime: process.version,
    refs: {
        dash500: '4d23d75e9e9096666afb2c80557d8ccbe1a20cc9',
        dash520: '4a2d7a93782e544999734410166101a68f8ba079',
        baseline: 'cb2640d0a77608f9f438044668947222bc6c2fef',
        pr5120: '87670d1bcf3a6c4b83bb43cee9e7f87662364b93',
        upstreamTag: 'wooorm/bcp-47-normalize@2.3.0'
    },
    versions: Object.fromEntries(['bcp-47-normalize', 'bcp-47-match', 'bcp-47', 'is-alphabetical', 'is-alphanumerical', 'is-decimal'].map(name => [name, JSON.parse(readFileSync('node_modules/' + name + '/package.json')).version])),
    tables: {matches: matches.length, fields: fields.length, likely: Object.keys(likely).length, parserNormal: Object.keys(normal).length, ambiguousRegions: Object.keys(many.region).length, iso639: Object.keys(ISO_639_2_TO_1).length},
    overall: stats(rows),
    parserAccepted: stats(rows.filter(x => x.parserAccepts)),
    perFamily: Object.fromEntries(families.map(family => [family, stats(rows.filter(row => row.families.includes(family)))])),
    directRuleProbes: {
        matches: stats(ruleInventory.matches.map(rule => rule.probes[0])),
        fieldsQaa: stats(ruleInventory.fields.map(rule => rule.probes[0])),
        parserNormal: stats(ruleInventory.parserNormal.map(rule => rule.probe))
    },
    upstreamFixturesPassed: Object.keys(fixtures).length,
    v520VsBaselineDifferences: rows.filter(x => x.baseline !== x.v520).length,
    isoDifferences,
    fixedInputs: rows.filter(x => x.baselineDiffers && !x.proposedDiffers).map(x => x.input),
    sha256: Object.fromEntries(sourceFiles.map(file => [file, createHash('sha256').update(readFileSync(file)).digest('hex')]))
};
for (const [name, value] of Object.entries({summary, results: rows, 'rule-inventory': ruleInventory, matching, 'primitive-behavior': primitiveBehavior})) {
    writeFileSync(new URL('./' + name + '.json', import.meta.url), JSON.stringify(value, null, 2) + '\n');
}
const display = x => x === '' ? '`""`' : '`' + x + '`';
let markdown = '| Entrée | Ancien 2.3.0 | Avant PR / 5.2.0 | PR #5120 |\n|---|---|---|---|\n';
for (const tag of examples) {
    const r = byInput.get(tag);
    markdown += '| ' + [tag, r.legacy, r.baseline, r.proposed].map(display).join(' | ') + ' |\n';
}
writeFileSync(new URL('./examples.md', import.meta.url), markdown);
let missing = '**Mappings et règles encore divergents après la PR #5120**\n\n' +
    'Généré depuis les tables npm de bcp-47-normalize 2.3.0. Chaque ligne compare la sortie finale des normaliseurs pour une entrée documentée. La cible brute de la règle peut encore être modifiée par les étapes suivantes : ce fichier ne constitue pas une table de remplacement à copier dans dash.js.\n\n' +
    'Les combinaisons de minimisation CLDR sont dans results.json et rule-inventory.json. Voir AUDIT.md pour le périmètre et les limites.\n\n';
for (const [title, key] of [
    ['Alias de langue / tags composés — entrées source', 'matches'],
    ['Alias de script, région et variante — contexte qaa', 'fields'],
    ['Tags historiques du parseur', 'parserNormal']
]) {
    const entries = ruleInventory[key].map(entry => {
        const probe = entry.probes ? entry.probes[0] : entry.probe;
        const target = key === 'fields' ? entry.rule.to.field + ':' + entry.rule.to.value : key === 'matches' ? entry.rule.to : entry.to;
        return {probe, target};
    }).filter(({probe}) => probe.proposedDiffers);
    missing += '**' + title + ' (' + entries.length + ')**\n\n' +
        '| Entrée testée | Cible brute de la règle | Ancien | Avant PR | PR #5120 |\n|---|---|---|---|---|\n';
    for (const {probe, target} of entries) missing += '| ' + [probe.input, target, probe.legacy, probe.baseline, probe.proposed].map(display).join(' | ') + ' |\n';
    missing += '\n';
}
writeFileSync(new URL('./missing-mappings.md', import.meta.url), missing.trimEnd() + '\n');
console.log(JSON.stringify({...summary, sha256: undefined, isoDifferences: isoDifferences.map(({input, legacy, baseline, proposed}) => ({input, legacy, baseline, proposed}))}, null, 2));
console.log('Matching:', JSON.stringify(matching, null, 2));
