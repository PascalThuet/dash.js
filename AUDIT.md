**Audit de compatibilité BCP 47 — dash.js #5090 / PR #5120**

9 septembre 2026. Comparaison exécutée sur les implémentations historiques et les données exactes de la bibliothèque retirée.

**Conclusion**

Les deux exceptions de la PR restaurent les valeurs rapportées pour `zh-cmn` et `nl-NL`, mais ne restaurent pas la compatibilité générale avec `bcp-47-normalize`. Les différences comprennent des alias de langue, des tags historiques, des alias de région/script/variante, la minimisation CLDR et des règles de formatage. Elles affectent aussi les entrées du filtrage des pistes.

La demande de dsilhavy est donc fondée : d’autres correspondances manquent. Le commentaire de stschr soulève en plus une question de conception : reproduire l’ancienne normalisation ne suffit pas à classer les pistes selon la précision de la préférence utilisateur. [Demande d’audit](https://github.com/Dash-Industry-Forum/dash.js/issues/5090#issuecomment-5480126495), [commentaire de stschr](https://github.com/Dash-Industry-Forum/dash.js/pull/5120#issuecomment-5584690532).

**1. Références et méthode**

| Élément | Référence auditée |
|---|---|
| Ancienne bibliothèque | `bcp-47-normalize@2.3.0` |
| Parseur associé | `bcp-47@2.1.0` |
| Filtrage conservé | `bcp-47-match@2.0.3` |
| dash.js 5.0.0 | `4d23d75e9e9096666afb2c80557d8ccbe1a20cc9` |
| dash.js 5.2.0 | `4a2d7a93782e544999734410166101a68f8ba079` |
| Base de la PR | `cb2640d0a77608f9f438044668947222bc6c2fef` |
| PR #5120 | `87670d1bcf3a6c4b83bb43cee9e7f87662364b93` |

Le lockfile de 5.0.0 et celui précédant #4970 indiquent la même version 2.3.0. Les versions et empreintes d’intégrité npm des six dépendances installées pour l’audit correspondent à celles de 5.0.0. Les cinq fichiers d’implémentation et de données du normaliseur correspondent aussi, par empreinte Git, au tag upstream 2.3.0. Les appels de dash.js utilisaient les options par défaut. [Lockfile 5.0.0](https://github.com/Dash-Industry-Forum/dash.js/blob/4d23d75e9e9096666afb2c80557d8ccbe1a20cc9/package-lock.json), [remplacement #4970](https://github.com/Dash-Industry-Forum/dash.js/pull/4970), [sources upstream](https://github.com/wooorm/bcp-47-normalize/tree/2.3.0).

Le corpus est construit à partir de toutes les entrées des tables suivantes, complétées par des projections langue/script/région, des tags avec suffixe privé, les fixtures upstream et des exemples ciblés :

| Table examinée | Entrées |
|---|---:|
| `matches`: alias de langue et tags composés | 462 |
| `fields`: alias de script, région, variante | 320 : 1 script, 317 régions, 2 variantes |
| `likely`: données CLDR de sous-tags probables | 8 034 |
| `bcp-47/lib/normal`: tags historiques | 26, dont 21 ont une forme de remplacement |
| `many.region`: remplacements régionaux ambigus | 23 |
| Table ISO du normaliseur dash.js | 202 |

Il s’agit d’un inventaire exhaustif des entrées de ces tables, avec des contextes de comparaison explicites. Ce n’est pas une énumération exhaustive des tags BCP 47 et de toutes leurs combinaisons possibles. Le parseur vérifie une structure syntaxique ; son acceptation ne prouve pas l’enregistrement de chaque sous-tag ni la validité de toutes les combinaisons.

**2. Résultats mesurés**

| Ensemble | Entrées distinctes | Sorties différentes avant PR | Sorties différentes après PR |
|---|---:|---:|---:|
| Corpus complet | 32 390 | 23 904 | 23 896 |
| Entrées acceptées par le parseur historique | 32 373 | 23 888 | 23 880 |
| Sources directes des 462 règles `matches` | 462 | 262 | 261 |
| Règles `fields`, chacune dans le contexte `qaa` | 320 | 320 | 320 |
| Entrées des tags historiques | 26 | 21 | 21 |
| Codes de la table ISO dash.js, sans suffixe | 202 | 2 | 2 |
| Fixtures de l’ancienne bibliothèque | 89 | 57 | 57 |

Les sous-ensembles se recoupent : leurs totaux ne doivent pas être additionnés. Les grands nombres proviennent surtout d’un corpus volontairement riche en combinaisons CLDR ; ils ne mesurent pas la fréquence des problèmes dans les MPD de production. Les écarts sont des comparaisons de chaînes, pas autant de bogues indépendants.

Sur ce corpus, la PR rétablit huit entrées, correspondant aux deux familles ciblées avec différentes casses ou formes ISO : `NL-NL`, `NLD-NL`, `NLD-nl`, `ZH-CMN`, `nl-NL`, `nl-nl`, `zh-CMN`, `zh-cmn`. Aucun cas auparavant identique à l’ancien résultat ne devient différent dans ce corpus. La base de la PR et le normaliseur de 5.2.0 produisent les mêmes résultats sur toutes les entrées.

La liste détaillée des règles encore divergentes se trouve dans [missing-mappings.md](missing-mappings.md). Les sorties complètes et la provenance de chaque entrée sont dans [results.json](results.json) ; l’inventaire par règle est dans [rule-inventory.json](rule-inventory.json).

**3. Familles de différences**

Dans les tableaux suivants, la colonne « PR » reste généralement identique à 5.2.0 : les deux exceptions ne corrigent pas ces familles.

| Famille / entrée | Ancien normaliseur | 5.2.0 | PR |
|---|---|---|---|
| Alias historique `iw` | `he` | `iw` | `iw` |
| Alias historique `in` | `id` | `in` | `in` |
| Alias historique `ji` | `yi` | `ji` | `ji` |
| Alias avec script `sh` | `sr-Latn` | `sh` | `sh` |
| Correspondance CLDR `cmn` | `zh` | `cmn` | `cmn` |
| Correspondance CLDR `arb` | `ar` | `arb` | `arb` |
| Correspondance CLDR `swh` | `sw` | `swh` | `swh` |
| Code ISO `tgl` | `fil` | `tl` | `tl` |
| Code ISO `twi` | `ak` | `tw` | `tw` |
| Tag historique `i-klingon` | `tlh` | `i-klingon` | `i-klingon` |
| Tag historique `sgn-BE-FR` | `sfb` | `sgn-BE-FR` | `sgn-BE-FR` |
| Région par défaut `en-US` | `en` | `en-US` | `en-US` |
| Région par défaut `fr-FR` | `fr` | `fr-FR` | `fr-FR` |
| Région par défaut `pt-BR` | `pt` | `pt-BR` | `pt-BR` |
| Région conservée `pt-PT` | `pt-PT` | `pt-PT` | `pt-PT` |
| Script par défaut `sr-Cyrl` | `sr` | `sr-Cyrl` | `sr-Cyrl` |
| Script conservé `sr-Latn` | `sr-Latn` | `sr-Latn` | `sr-Latn` |
| Script/région `zh-Hant` | `zh-TW` | `zh-Hant` | `zh-Hant` |
| Script/région `zh-Hans` | `zh` | `zh-Hans` | `zh-Hans` |
| Région numérique `en-840` | `en` | `en-840` | `en-840` |
| Alias de région `en-UK` | `en-GB` | `en-UK` | `en-UK` |
| Alias de script `en-Qaai` | `en-Zinh` | `en-Qaai` | `en-Qaai` |
| Alias de variante `el-polytoni` | `el-polyton` | `el-polytoni` | `el-polytoni` |
| Tri des variantes `sl-rozaj-biske` | `sl-biske-rozaj` | `sl-rozaj-biske` | `sl-rozaj-biske` |
| Tri des extensions `en-b-warble-a-warble` | `en-a-warble-b-warble` | inchangé | inchangé |

L’ancienne bibliothèque exécutait successivement le parsing des tags historiques, les règles de remplacement, la minimisation des sous-tags probables, le tri des variantes/extensions et la remise en forme de la casse. La table ISO légère reproduit 200 des 202 résultats des codes isolés qu’elle contient ; `tgl` et `twi` divergent en raison des choix CLDR supplémentaires de l’ancienne bibliothèque. Ces divergences ne prouvent pas que les correspondances ISO actuelles sont erronées : elles prouvent une différence de contrat. [Implémentation 2.3.0](https://github.com/wooorm/bcp-47-normalize/blob/2.3.0/lib/index.js), [alias de langue](https://github.com/wooorm/bcp-47-normalize/blob/2.3.0/lib/matches.js), [alias de champs](https://github.com/wooorm/bcp-47-normalize/blob/2.3.0/lib/fields.js).

Le cas `nl-NL → nl` relève d’un mécanisme général de minimisation, qui s’applique également aux scripts et aux combinaisons de sous-tags. Il ne serait pas correct de supprimer systématiquement toutes les régions : `pt-BR` se réduit à `pt`, alors que `pt-PT` reste distinct. Pour `zh-Hant`, le résultat historique exprime même la distinction au moyen d’une région. Les 8 034 entrées volumineuses sont des données CLDR de sous-tags probables, et non simplement une liste de langues ISO à convertir. [Données `likely`](https://github.com/wooorm/bcp-47-normalize/blob/2.3.0/lib/likely.js), [générateur des données](https://github.com/wooorm/bcp-47-normalize/blob/2.3.0/build.js).

**4. Limites spécifiques des deux exceptions**

| Entrée | Ancien | PR |
|---|---|---|
| `zh-cmn` | `zh` | `zh` |
| `zh-cmn-Hans-CN` | `zh` | `zh-cmn-Hans-CN` |
| `zh-cmn-x-audit` | `zh-x-audit` | `zh-cmn-x-audit` |
| `nl-NL` | `nl` | `nl` |
| `nl-NL-x-audit` | `nl-x-audit` | `nl-NL-x-audit` |
| `nl-NL-u-ca-gregory` | `nl-u-ca-gregory` | `nl-NL-u-CA-gregory` |

Le dictionnaire compare le tag complet après la normalisation légère. Il ne traite donc pas les mêmes langues lorsqu’un suffixe est présent. Ajouter des exceptions complètes une par une ne reproduira pas les règles de transformation composables de l’ancienne bibliothèque. [Code de la PR](https://github.com/PascalThuet/dash.js/blob/87670d1bcf3a6c4b83bb43cee9e7f87662364b93/src/streaming/utils/BCP47Utils.js).

**5. Autres différences à distinguer d’une régression souhaitable à corriger**

La normalisation légère décide de la casse uniquement selon la longueur du sous-tag. Elle traite ainsi `ca` dans `en-u-ca-gregory` comme une région (`CA`) et `LATN` dans `en-x-ab-LATN` comme un script (`Latn`). L’ancien résultat est respectivement `en-u-ca-gregory` et `en-x-ab-latn`. Ces différences de casse restent visibles dans les chaînes exposées ; `extendedFilter` étant insensible à la casse, elles ne modifient pas à elles seules son résultat.

Les tags mal formés demandent une analyse par point d’appel. Pour `EN_US`, l’ancien normaliseur retourne une chaîne vide. Cependant, `LangMatcher` revient alors à `String(str)` : la valeur MPD exposée reste `EN_US`, tandis que le nouveau normaliseur retourne `en_us`. Il serait faux de conclure que toutes les valeurs invalides deviennent des langues vides dans l’ancien lecteur. Le normaliseur léger conserve aussi les valeurs non textuelles, là où l’ancien retourne une chaîne ; ces cas sont consignés séparément dans [primitive-behavior.json](primitive-behavior.json). [LangMatcher historique](https://github.com/Dash-Industry-Forum/dash.js/blob/4d23d75e9e9096666afb2c80557d8ccbe1a20cc9/src/dash/parser/matchers/LangMatcher.js).

L’ancien comportement n’est pas toujours un objectif produit évident : `und → en` et `und-Arab → ar` résultent des données de sous-tags probables. Une promesse de compatibilité exacte inclurait ces résultats ; il faut décider explicitement s’ils sont souhaités. De même, les correspondances de macrolangues ne signifient pas que toutes les langues concernées peuvent être traitées comme interchangeables pour un utilisateur.

Les 23 entrées de régions ambiguës ne produisent pas de différence sur les sondes `pap-<région>`. L’ancienne bibliothèque possède un mécanisme d’avertissement pour certains de ces cas, mais dash.js ne lui fournissait pas de callback `warning`. Il ne faut donc pas transformer cette table en choix automatique arbitraire de région. [Table `many`](https://github.com/wooorm/bcp-47-normalize/blob/2.3.0/lib/many.js).

**6. Effets sur le filtrage et lien avec stschr**

Les langues des MPD passent par `LangMatcher`. Les langues des sous-titres embarqués passent également par le normaliseur dans `DashAdapter`. Dans `MediaController`, la préférence utilisateur est normalisée avant `extendedFilter`. Une modification du normaliseur peut donc changer le filtrage sans modifier son algorithme. [MediaController de la PR](https://github.com/PascalThuet/dash.js/blob/87670d1bcf3a6c4b83bb43cee9e7f87662364b93/src/streaming/controllers/MediaController.js), [DashAdapter](https://github.com/PascalThuet/dash.js/blob/87670d1bcf3a6c4b83bb43cee9e7f87662364b93/src/dash/DashAdapter.js).

Résultats du prédicat de langue, en normalisant d’abord la langue MPD comme le fait le parseur :

| Préférence | Langue de piste dans le MPD | Ancien | 5.2.0 | PR |
|---|---|---|---|---|
| `en-US` | `en` | oui | non | non |
| `en-US` | `en-GB` | oui | non | non |
| `en-GB` | `en` | non | non | non |
| `nl-NL` | `nl-BE` | oui | non | oui |
| `zh-Hant` | `zh-TW` | oui | non | non |
| `zh-Hant` | `zh-Hant-HK` | non | oui | oui |
| `sr-Cyrl` | `sr` | oui | non | non |
| `iw` | `he` | oui | non | non |

Ces résultats sont vérifiés sur les fonctions extraites des sources des trois versions. Ils ne prédisent pas à eux seuls la piste finalement sélectionnée : lorsque le filtre ne retient aucune piste, `filterTracksBySettings` ignore cette préférence et restitue sa liste d’entrée, puis les autres règles interviennent. Les essais ne constituent pas des tests de lecture complets.

La description actuelle de #5120 doit donc être précisée : la PR conserve l’algorithme directionnel RFC 4647, mais elle restaure/modifie certaines correspondances, par exemple `nl-NL` avec `nl-BE`. Les tests directionnels ajoutés sur `en-GB` n’établissent pas l’absence d’effet pour les langues modifiées.

Enfin, l’ancien comportement ne satisfaisait pas déjà le classement proposé par stschr. Une piste `en-US` et une piste `en` étaient toutes deux exposées comme `en` après normalisation. Le filtre acceptait même `en-GB` pour une préférence initiale `en-US`, puisque cette préférence devenait `en`. Pour prioriser une correspondance régionale exacte, il faut conserver assez d’information avant la minimisation et comparer l’ensemble des pistes. Cela demande une décision de conception distincte de la compatibilité des valeurs exposées.

**7. Recommandation pour la suite de la PR**

1. Présenter cet inventaire à dsilhavy et reconnaître que les deux exceptions ne permettent pas d’annoncer une compatibilité générale. Elles corrigent uniquement les valeurs ciblées et certaines variations de casse/code ISO.
2. Définir le contrat recherché : compatibilité exacte avec les sorties 2.3.0, y compris `und → en`, ou normalisation limitée dont les écarts sont documentés. Les tests actuels demandent par exemple de préserver `und` et `zh-Hans`, ce qui diffère déjà des résultats historiques.
3. Si la compatibilité exacte est requise, couvrir les étapes composables de l’ancienne bibliothèque et les données nécessaires. Une réintroduction de la dépendance ou une implémentation équivalente doit être évaluée sur la compatibilité et la taille réelle du bundle. Cet audit ne démontre pas qu’une petite table finie de tags complets peut la remplacer.
4. Traiter explicitement le classement souhaité par stschr : correspondance exacte, langue générique, autre région en repli, interactions de scripts et des autres préférences. Conserver l’information région/script nécessaire, même si une valeur publique minimisée est maintenue pour compatibilité.
5. Utiliser les exemples de cet audit pour des tests de comportement : alias avec suffixes, régions par défaut et non par défaut, scripts distincts, préférence normalisée des deux côtés et absence de correspondance. La refonte de sélection mérite aussi des tests sur des ensembles de pistes, au-delà du prédicat individuel.

La décision de réunir ces travaux dans #5120 ou dans des PR distinctes appartient aux mainteneurs ; leurs commentaires ne fixent pas encore ce découpage.

**8. Vérification et reproduction**

Les six tests upstream ont réussi, dont le test contenant les 89 fixtures. Les comparaisons ont été exécutées sous Node `v25.2.1`. Les 45 vérifications de prédicat de langue et les 18 vérifications du convertisseur `LangMatcher` ont réussi. Les versions/intégrités de six dépendances historiques et cinq empreintes de fichiers upstream ont été vérifiées. [Résultats résumés](summary.json), [vérifications](verification.json), [matrice de filtrage](matching.json).

Les dépendances complètes de dash.js n’étant pas installées dans ce worktree, les fonctions de filtrage/conversion ont été extraites des sources versionnées et exécutées isolément avec les vraies bibliothèques. Aucun lecteur complet, flux de production ni build de bundle n’a été testé pendant cet audit. Les différences observées ne constituent pas une estimation d’impact en production ni une démonstration de conformité à tous les standards.

Depuis le dossier de l’audit, avec Node et npm disponibles :

```sh
rtk proxy npm ci --ignore-scripts --no-audit --no-fund
rtk proxy npm test
rtk proxy npm run audit
rtk proxy npm run verify
```

Les snapshots, dépendances verrouillées, scripts et résultats sont joints. `upstream-test.js` est le fichier de tests upstream inchangé ; `index.js` est uniquement son adaptateur d’import. Sa licence est dans `UPSTREAM-LICENSE.txt`. Les snapshots dash.js conservent leur en-tête BSD.

Un [résumé en anglais](github-comment.md) accompagne l’audit. Ce dossier publie les éléments de comparaison ; aucun fichier du code applicatif de dash.js n’a été modifié par cet audit.
