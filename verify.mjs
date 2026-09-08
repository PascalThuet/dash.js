import assert from 'node:assert/strict';
import {readFileSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {bcp47Normalize} from 'bcp-47-normalize';
import {extendedFilter} from 'bcp-47-match';
import {normalizeBcp47 as release} from './v5.2.0.mjs';
import {normalizeBcp47 as proposed} from './pr-5120.mjs';

const lock = JSON.parse(readFileSync('package-lock.json'));
const historical = JSON.parse(readFileSync('historical-dependencies.json'));
for (const [name, dependency] of Object.entries(historical)) {
    assert.equal(lock.packages[name].version, dependency.version);
    assert.equal(lock.packages[name].integrity, dependency.integrity);
}

const matching = JSON.parse(readFileSync('matching.json'));
const snapshots = [];
let predicateChecks = 0;
let parserChecks = 0;
for (const [version, normalize, expectedKey] of [
    ['v5.0.0', bcp47Normalize, 'legacy'],
    ['v5.2.0', release, 'baseline'],
    ['pr-5120', proposed, 'proposed']
]) {
    const file = version + '-MediaController.txt';
    const source = readFileSync(file, 'utf8');
    const method = source.match(/    function matchSettingsLang\(settings, track\) \{[\s\S]*?\n    \}/)[0];
    const context = vm.createContext({bcp47Normalize: normalize, normalizeBcp47: normalize, extendedFilter});
    const predicate = vm.runInContext(method + '\nmatchSettingsLang', context);
    for (const row of matching) {
        assert.equal(!!predicate({lang: row.preference}, {lang: row[expectedKey].track}), row[expectedKey].matches);
        predicateChecks++;
    }
    const parserFile = version + '-LangMatcher.txt';
    const parserSource = readFileSync(parserFile, 'utf8');
    const converterSource = parserSource.match(/str => \{[\s\S]*?\n            \}/)[0];
    const converter = vm.runInContext('(' + converterSource + ')', context);
    for (const tag of ['EN_US', 'EN-GB-ABCDEFGHI', 'en-', 'en--US', 'zh-cmn', 'nl-NL']) {
        assert.equal(converter(tag), normalize(tag) || String(tag));
        parserChecks++;
    }
    for (const snapshot of [file, parserFile]) snapshots.push({file: snapshot, sha256: createHash('sha256').update(readFileSync(snapshot)).digest('hex')});
}

// Verify the installed implementation/data match the GitHub 2.3.0 source blobs.
const blobs = {
    'index.js': '3d61b7e9ef577bf8220c3ca9a73056b3e84052c7',
    'fields.js': '0f2c6ddeac5eb2b4af6b6942d3956e7574eaab83',
    'matches.js': 'ea270cbc7e0149ce007004d7c1c08f272b872391',
    'likely.js': 'cfd8f9aa828c4aa8922ad5dfd4a28a307cf8f28f',
    'many.js': '9e45d334a848496146dad2686bb1702458284fea'
};
for (const [file, expected] of Object.entries(blobs)) {
    const data = readFileSync('node_modules/bcp-47-normalize/lib/' + file);
    assert.equal(createHash('sha1').update('blob ' + data.length + '\0').update(data).digest('hex'), expected);
}
const upstreamTest = readFileSync('upstream-test.js');
assert.equal(createHash('sha1').update('blob ' + upstreamTest.length + '\0').update(upstreamTest).digest('hex'), '82eb2195715ad80195303cfc320fbb7bc6b973cd');
const result = {historicalDependenciesVerified: Object.keys(historical).length, upstreamBlobsVerified: Object.keys(blobs).length, predicateChecks, parserChecks, snapshots, scope: 'Source-extracted language predicates and parser converters, not whole-player integration tests'};
writeFileSync('verification.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
