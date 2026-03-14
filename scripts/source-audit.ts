import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import yauzl from 'yauzl';
import { XMLParser } from 'fast-xml-parser';
import { format as formatWithPrettier } from 'prettier';
import { BOBBERS, ENCHANTS, LINES, RODS } from '../src/data/equipment';
import { CALCULATOR_RARITIES, FISH_DATA } from '../src/data/fish';
import type {
  FormulaEvidenceStatus,
  PublicEntryGap,
  SourceAuditDiff,
  SourceAuditSnapshot,
  SourceRevisionSnapshot,
} from '../src/types';

const FANDOM_API = 'https://fish-trickforge-studio.fandom.com/api.php';
const SHEET_XLSX_URL =
  'https://docs.google.com/spreadsheets/d/1SAggImcqOJbcTP0owCrqv13Z71ZnXynYL64OB5I1CSY/export?format=xlsx';
const OUTPUT_PATH = resolve(process.cwd(), 'src/data/source-audit.json');
const JSON_SPACING = 2;

type XmlNode = Record<string, unknown>;

const parser = new XMLParser({
  attributeNamePrefix: '',
  ignoreAttributes: false,
  ignoreDeclaration: true,
  ignorePiTags: true,
  parseTagValue: false,
  trimValues: false,
});

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function stripWikiMarkup(value: string): string {
  let text = value;
  text = text.replace(/<!--[\s\S]*?-->/g, '');
  text = text.replace(/<span[^>]*>/gi, '');
  text = text.replace(/<\/span>/gi, '');
  text = text.replace(/<small[^>]*>/gi, '');
  text = text.replace(/<\/small>/gi, '');
  text = text.replace(/<br\s*\/?>/gi, ' ');
  text = text.replace(/\[\[(?:[^|\]]+\|)?([^\]]+)\]\]/g, '$1');
  text = text.replace(/\{\{[^{}]+\}\}/g, '');
  text = text.replace(/\|-\s*$/gm, '');
  text = text.replace(/&nbsp;/g, ' ');
  return normalizeWhitespace(text);
}

function normalizeName(value: string): string {
  const normalized = stripWikiMarkup(value).replace(/\s+/g, ' ').trim();

  const aliases: Record<string, string> = {
    'Black Sharkminnow': 'Black Shark Minnow',
    'GiltHead Bream': 'GillHead Bream',
  };

  return aliases[normalized] ?? normalized;
}

function parseSignedNumber(value: string): number {
  const cleaned = stripWikiMarkup(value)
    .replace(/\$/g, '')
    .replace(/,/g, '')
    .replace(/kg/gi, '')
    .replace(/%/g, '')
    .trim();
  if (!cleaned || cleaned === '-' || cleaned === '—') return 0;
  return Number(cleaned);
}

function parsePrice(value: string): number {
  return parseSignedNumber(value);
}

function parseKg(value: string): number {
  return parseSignedNumber(value);
}

function parsePercent(value: string): number {
  return parseSignedNumber(value);
}

async function stableJson(value: unknown): Promise<string> {
  const raw = JSON.stringify(value, null, JSON_SPACING) + '\n';
  return formatWithPrettier(raw, { filepath: OUTPUT_PATH });
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return (await response.json()) as T;
}

async function fetchArrayBuffer(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function readZipEntries(buffer: Buffer): Promise<Map<string, Buffer>> {
  return new Promise((resolveMap, reject) => {
    yauzl.fromBuffer(buffer, { lazyEntries: true }, (error, zipFile) => {
      if (error || !zipFile) {
        reject(error ?? new Error('Could not open workbook zip'));
        return;
      }

      const files = new Map<string, Buffer>();

      zipFile.readEntry();
      zipFile.on('entry', (entry) => {
        if (/\/$/.test(entry.fileName)) {
          zipFile.readEntry();
          return;
        }

        zipFile.openReadStream(entry, (streamError, stream) => {
          if (streamError || !stream) {
            reject(streamError ?? new Error(`Could not read ${entry.fileName}`));
            return;
          }

          const chunks: Buffer[] = [];
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('end', () => {
            files.set(entry.fileName, Buffer.concat(chunks));
            zipFile.readEntry();
          });
          stream.on('error', reject);
        });
      });

      zipFile.on('end', () => resolveMap(files));
      zipFile.on('error', reject);
    });
  });
}

function parseXml(buffer: Buffer): XmlNode {
  return parser.parse(buffer.toString('utf8')) as XmlNode;
}

function asNode(value: unknown): XmlNode {
  return (value ?? {}) as XmlNode;
}

function nodeArray(value: unknown): XmlNode[] {
  return toArray(value as XmlNode | XmlNode[] | undefined);
}

function getWorkbookSheetTarget(entries: Map<string, Buffer>, sheetName: string): string {
  const workbook = parseXml(entries.get('xl/workbook.xml')!);
  const workbookRels = parseXml(entries.get('xl/_rels/workbook.xml.rels')!);

  const workbookNode = asNode(workbook.workbook);
  const sheetsNode = asNode(workbookNode.sheets);
  const sheet = nodeArray(sheetsNode.sheet).find((candidate) => candidate.name === sheetName);

  if (!sheet) {
    throw new Error(`Workbook sheet "${sheetName}" not found`);
  }

  const relationId = String(sheet['r:id']);
  const workbookRelsNode = asNode(workbookRels.Relationships);
  const relation = nodeArray(workbookRelsNode.Relationship).find(
    (candidate) => candidate.Id === relationId,
  );

  if (!relation) {
    throw new Error(`Workbook relation "${relationId}" not found`);
  }

  return `xl/${String(relation.Target)}`.replace(/\\/g, '/');
}

function buildSharedStrings(entries: Map<string, Buffer>): string[] {
  const sharedStringsEntry = entries.get('xl/sharedStrings.xml');
  if (!sharedStringsEntry) return [];

  const sharedStrings = parseXml(sharedStringsEntry);
  const sharedStringsNode = asNode(sharedStrings.sst);
  const items = nodeArray(sharedStringsNode.si);

  return items.map((item) => {
    if (typeof item.t === 'string') return item.t;
    if (item.t && typeof item.t === 'object' && '#text' in item.t) {
      return String((item.t as XmlNode)['#text'] ?? '');
    }
    const richText = toArray((item.r as XmlNode | XmlNode[] | undefined) ?? []);
    return richText
      .map((segment) => {
        const text = (segment as XmlNode).t;
        if (typeof text === 'string') return text;
        if (text && typeof text === 'object' && '#text' in (text as XmlNode)) {
          return String((text as XmlNode)['#text'] ?? '');
        }
        return '';
      })
      .join('');
  });
}

function parseWorksheetRows(
  entries: Map<string, Buffer>,
  sheetName: string,
): Array<Record<string, string>> {
  const target = getWorkbookSheetTarget(entries, sheetName);
  const worksheet = parseXml(entries.get(target)!);
  const sharedStrings = buildSharedStrings(entries);
  const worksheetNode = asNode(worksheet.worksheet);
  const sheetDataNode = asNode(worksheetNode.sheetData);
  const rows = nodeArray(sheetDataNode.row);

  return rows.map((row) => {
    const cells = toArray((row.c as XmlNode | XmlNode[] | undefined) ?? []);
    const mapped: Record<string, string> = {};
    for (const cell of cells) {
      const ref = String(cell.r ?? '');
      const column = ref.replace(/\d+/g, '');
      const cellType = String(cell.t ?? '');
      const rawValue = cell.v === undefined ? '' : String(cell.v);
      const value =
        cellType === 's' ? (sharedStrings[Number(rawValue)] ?? '') : String(rawValue ?? '');
      mapped[column] = value;
    }
    return mapped;
  });
}

interface FishSheetRow {
  name: string;
  minWeightKg?: number;
  maxWeightKg?: number;
  priceFloor?: number;
  priceCeiling?: number;
}

function parseFishSheetRows(entries: Map<string, Buffer>): FishSheetRow[] {
  const rows = parseWorksheetRows(entries, 'MAP, SCRAP, FISH, & MISC');
  const result: FishSheetRow[] = [];

  for (const row of rows) {
    const name = normalizeName(row.J ?? '');
    if (!name) continue;

    const minWeight = row.O ? Number(row.O) : undefined;
    const priceFloor = row.P ? Number(row.P) : undefined;
    const maxWeight = row.Q ? Number(row.Q) : undefined;
    const priceCeiling = row.R ? Number(row.R) : undefined;

    if (
      minWeight === undefined &&
      maxWeight === undefined &&
      priceFloor === undefined &&
      priceCeiling === undefined
    ) {
      continue;
    }

    if (
      ['Fish Name', 'Secret', 'Ultimate Secret', 'Secret Fish', 'Ultimate Secret Fish'].includes(
        name,
      )
    ) {
      continue;
    }

    result.push({
      name,
      minWeightKg: Number.isFinite(minWeight ?? NaN) ? minWeight : undefined,
      maxWeightKg: Number.isFinite(maxWeight ?? NaN) ? maxWeight : undefined,
      priceFloor: Number.isFinite(priceFloor ?? NaN) ? priceFloor : undefined,
      priceCeiling: Number.isFinite(priceCeiling ?? NaN) ? priceCeiling : undefined,
    });
  }

  return result;
}

function parseWikiTableBlocks(wikitext: string): string[] {
  return [...wikitext.matchAll(/\{\| class="wikitable sortable"[\s\S]*?\|\}/g)].map(
    (match) => match[0],
  );
}

function parseTableRows(block: string): string[][] {
  return [...block.matchAll(/\|-\s*\n([\s\S]*?)(?=\n\|-\s*\n|\n\|\})/g)].map((match) =>
    match[1]
      .split('||')
      .map((cell) => stripWikiMarkup(cell.replace(/^\|/, '').trim()))
      .map((cell) => cell.trim()),
  );
}

type EquipmentRow = {
  name: string;
  price: number;
  location: string;
  luck: number;
  strength: number;
  expertise: number;
  attractionPct: number;
  bigCatch: number;
  maxWeightKg: number;
};

function parseRods(wikitext: string): EquipmentRow[] {
  const block = parseWikiTableBlocks(wikitext).find((candidate) =>
    candidate.includes('! Rod Name'),
  );
  if (!block) throw new Error('Rod table not found');

  return parseTableRows(block)
    .filter((cells) => cells.length >= 9 && cells[0] !== 'Rod Name')
    .map((cells) => ({
      name: normalizeName(cells[0]),
      price: parsePrice(cells[1]),
      location: normalizeWhitespace(cells[2]),
      luck: parseSignedNumber(cells[3]),
      strength: parseSignedNumber(cells[4]),
      expertise: parseSignedNumber(cells[5]),
      attractionPct: parsePercent(cells[6]),
      bigCatch: parseSignedNumber(cells[7]),
      maxWeightKg: parseKg(cells[8]),
    }));
}

function parseLinesAndBobbers(wikitext: string): {
  lines: EquipmentRow[];
  bobbers: EquipmentRow[];
} {
  const blocks = parseWikiTableBlocks(wikitext);
  const lineBlock = blocks.find((candidate) => candidate.includes('! Line !! Price !! Location'));
  const bobberBlock = blocks.find((candidate) =>
    candidate.includes('! Bobber !! Price !! Location'),
  );
  if (!lineBlock || !bobberBlock) throw new Error('Accessory tables not found');

  const parseAccessory = (block: string): EquipmentRow[] =>
    parseTableRows(block)
      .filter((cells) => cells.length >= 8)
      .map((cells) => ({
        name: normalizeName(cells[0]),
        price: parsePrice(cells[1]),
        location: normalizeWhitespace(cells[2]),
        luck: parseSignedNumber(cells[3]),
        strength: parseSignedNumber(cells[4]),
        expertise: parseSignedNumber(cells[5]),
        attractionPct: parsePercent(cells[6]),
        bigCatch: parseSignedNumber(cells[7]),
        maxWeightKg: 0,
      }));

  return {
    lines: parseAccessory(lineBlock),
    bobbers: parseAccessory(bobberBlock),
  };
}

type EnchantRow = {
  name: string;
  specialEffect: string;
  luck: number;
  strength: number;
  expertise: number;
  attractionPct: number;
  bigCatch: number;
  maxWeightKg: number;
};

function parseEnchants(wikitext: string): EnchantRow[] {
  const block = parseWikiTableBlocks(wikitext).find((candidate) =>
    candidate.includes('! Name !! Rarity !! Special Effect'),
  );
  if (!block) throw new Error('Enchantment table not found');

  return parseTableRows(block)
    .filter((cells) => cells.length >= 9 && cells[0] !== 'Name')
    .map((cells) => ({
      name: normalizeName(cells[0]),
      specialEffect: normalizeWhitespace(cells[2]),
      luck: parseSignedNumber(cells[3]),
      strength: parseSignedNumber(cells[4]),
      expertise: parseSignedNumber(cells[5]),
      attractionPct: parsePercent(cells[6]),
      bigCatch: parseSignedNumber(cells[7]),
      maxWeightKg: parseKg(cells[8]),
    }));
}

type IndexFishRow = {
  name: string;
  rarity: string;
};

function parseIndexFishRows(wikitext: string): IndexFishRow[] {
  return parseWikiTableBlocks(wikitext)
    .filter((block) => block.includes('! Fish !! Photo !! Rarity'))
    .flatMap((block) => parseTableRows(block))
    .filter((cells) => cells.length >= 3)
    .map((cells) => ({
      name: normalizeName(cells[0]),
      rarity: normalizeWhitespace(cells[2]),
    }));
}

function compareEquipmentRows<TLocal extends { nameEn: string }, TSource extends { name: string }>(
  category: SourceAuditDiff['category'],
  localRows: TLocal[],
  sourceRows: TSource[],
  fields: string[],
): SourceAuditDiff[] {
  const sourceMap = new Map(sourceRows.map((row) => [row.name, row]));
  const diffs: SourceAuditDiff[] = [];

  for (const localRow of localRows) {
    const sourceRow = sourceMap.get(localRow.nameEn);
    if (!sourceRow) continue;

    for (const field of fields) {
      const localValue = localRow[field as keyof TLocal];
      const sourceValue = sourceRow[field as keyof TSource];
      if (
        typeof localValue !== 'number' &&
        typeof localValue !== 'string' &&
        localValue !== undefined
      ) {
        continue;
      }
      if (
        typeof sourceValue !== 'number' &&
        typeof sourceValue !== 'string' &&
        sourceValue !== undefined
      ) {
        continue;
      }
      if ((localValue as unknown) !== (sourceValue as unknown)) {
        diffs.push({
          category,
          name: localRow.nameEn,
          field,
          localValue: localValue as number | string,
          sourceValue: sourceValue as number | string,
        });
      }
    }
  }

  return diffs;
}

function compareFishRows(sourceFish: FishSheetRow[]): SourceAuditDiff[] {
  const sourceMap = new Map(sourceFish.map((row) => [row.name, row]));
  const diffs: SourceAuditDiff[] = [];

  for (const fish of FISH_DATA) {
    const source = sourceMap.get(fish.nameEn);
    if (!source) continue;

    const fields: Array<keyof FishSheetRow & keyof typeof fish> = [
      'minWeightKg',
      'maxWeightKg',
      'priceFloor',
      'priceCeiling',
    ];

    for (const field of fields) {
      const localValue = fish[field];
      const sourceValue = source[field];
      if (localValue !== undefined && sourceValue !== undefined && localValue !== sourceValue) {
        diffs.push({
          category: 'fish',
          name: fish.nameEn,
          field,
          localValue,
          sourceValue,
        });
      }
    }
  }

  return diffs;
}

function buildPublicEntryGaps(
  sourceFish: FishSheetRow[],
  indexFish: IndexFishRow[],
): {
  inScopeButUnmodeled: PublicEntryGap[];
  outsideCalculatorScope: PublicEntryGap[];
} {
  const localNames = new Set(FISH_DATA.map((fish) => fish.nameEn));
  const calculatorRarities = new Set(CALCULATOR_RARITIES);
  const indexMap = new Map(indexFish.map((fish) => [fish.name, fish.rarity]));
  const sourceNames = Array.from(new Set(sourceFish.map((row) => row.name))).sort((a, b) =>
    a.localeCompare(b),
  );

  const inScopeButUnmodeled: PublicEntryGap[] = [];
  const outsideCalculatorScope: PublicEntryGap[] = [];

  for (const name of sourceNames) {
    if (localNames.has(name)) continue;

    const rarity = indexMap.get(name);
    if (
      rarity &&
      calculatorRarities.has(rarity.toLowerCase() as (typeof CALCULATOR_RARITIES)[number])
    ) {
      inScopeButUnmodeled.push({
        name,
        rarity,
        reason:
          'Public Index lists this fish in a calculator rarity, but the local modeled fish list does not include it yet.',
      });
      continue;
    }

    outsideCalculatorScope.push({
      name,
      rarity,
      reason: rarity
        ? `Current calculator scope excludes ${rarity} entries or special/non-standard public rows.`
        : 'Public numeric source contains this entry, but the current calculator cannot classify it from published probability data.',
    });
  }

  return { inScopeButUnmodeled, outsideCalculatorScope };
}

function buildFormulaEvidence(): FormulaEvidenceStatus[] {
  return [
    {
      id: 'luck',
      label: 'Luck',
      status: 'qualitative-only',
      note: 'The public Index still says only that Luck increases rarity. No stronger published numeric formula was confirmed.',
      sourceIds: ['fish-fandom-index'],
    },
    {
      id: 'attraction-strength-expertise',
      label: 'Attraction Rate / Strength / Expertise',
      status: 'qualitative-only',
      note: 'The public Index describes what these stats influence, but not the exact timing or escape formulas used by the game.',
      sourceIds: ['fish-fandom-index'],
    },
    {
      id: 'big-catch-weight-price',
      label: 'Big Catch Rate / weight-to-price',
      status: 'qualitative-only',
      note: 'Public sources still say Big Catch Rate increases the chance of heavier fish, but no exact percentile or weight-to-price formula was confirmed.',
      sourceIds: ['fish-fandom-index', 'community-datamine'],
    },
    {
      id: 'special-rarity-probabilities',
      label: 'Secret / Ultimate Secret / Relic probabilities',
      status: 'qualitative-only',
      note: 'The public Index now publishes Relic at 3.00%, but Secret and Ultimate Secret still lack enough published probability data for the current calculator model.',
      sourceIds: ['fish-fandom-index'],
    },
  ];
}

async function getRevisionSnapshot(
  title: string,
  id: string,
  name: string,
  url: string,
): Promise<SourceRevisionSnapshot> {
  const response = await fetchJson<{
    query: {
      pages: Array<{ revisions: Array<{ revid: number; timestamp: string; comment?: string }> }>;
    };
  }>(
    `${FANDOM_API}?action=query&prop=revisions&rvprop=ids|timestamp|comment&titles=${encodeURIComponent(title)}&format=json&formatversion=2`,
  );

  const revision = response.query.pages[0]?.revisions?.[0];
  if (!revision) {
    throw new Error(`No revision found for ${title}`);
  }

  return {
    id,
    name,
    url,
    revid: revision.revid,
    timestamp: revision.timestamp,
    comment: revision.comment,
  };
}

async function getWikitext(title: string): Promise<string> {
  const response = await fetchJson<{
    query: { pages: Array<{ revisions: Array<{ slots: { main: { content: string } } }> }> };
  }>(
    `${FANDOM_API}?action=query&prop=revisions&rvslots=main&rvprop=content&titles=${encodeURIComponent(title)}&format=json&formatversion=2`,
  );

  return response.query.pages[0]?.revisions?.[0]?.slots?.main?.content ?? '';
}

async function buildSnapshot(): Promise<SourceAuditSnapshot> {
  const [
    indexRevision,
    rodsRevision,
    accessoriesRevision,
    enchantsRevision,
    indexText,
    rodsText,
    accessoriesText,
    enchantsText,
    workbookBuffer,
  ] = await Promise.all([
    getRevisionSnapshot(
      'Index',
      'fish-fandom-index',
      'Fandom Index',
      'https://fish-trickforge-studio.fandom.com/wiki/Index',
    ),
    getRevisionSnapshot(
      'Rods',
      'fish-fandom-rods',
      'Fandom Rods',
      'https://fish-trickforge-studio.fandom.com/wiki/Rods',
    ),
    getRevisionSnapshot(
      'Rod_Accessories',
      'fish-fandom-rod-accessories',
      'Fandom Rod Accessories',
      'https://fish-trickforge-studio.fandom.com/wiki/Rod_Accessories',
    ),
    getRevisionSnapshot(
      'Enchantments',
      'fish-fandom-enchantments',
      'Fandom Enchantments',
      'https://fish-trickforge-studio.fandom.com/wiki/Enchantments',
    ),
    getWikitext('Index'),
    getWikitext('Rods'),
    getWikitext('Rod_Accessories'),
    getWikitext('Enchantments'),
    fetchArrayBuffer(SHEET_XLSX_URL),
  ]);

  const workbookEntries = await readZipEntries(workbookBuffer);
  const fishSheetRows = parseFishSheetRows(workbookEntries);
  const indexFishRows = parseIndexFishRows(indexText);
  const rods = parseRods(rodsText);
  const { lines, bobbers } = parseLinesAndBobbers(accessoriesText);
  const enchants = parseEnchants(enchantsText);

  const modeledDiffs = compareFishRows(fishSheetRows);
  const equipmentDiffs = [
    ...compareEquipmentRows('rod', RODS, rods, [
      'price',
      'location',
      'luck',
      'strength',
      'expertise',
      'attractionPct',
      'bigCatch',
      'maxWeightKg',
    ]),
    ...compareEquipmentRows('line', LINES, lines, [
      'price',
      'location',
      'luck',
      'strength',
      'expertise',
      'attractionPct',
      'bigCatch',
    ]),
    ...compareEquipmentRows('bobber', BOBBERS, bobbers, [
      'price',
      'location',
      'luck',
      'strength',
      'expertise',
      'attractionPct',
      'bigCatch',
    ]),
    ...compareEquipmentRows('enchant', ENCHANTS, enchants, [
      'luck',
      'strength',
      'expertise',
      'attractionPct',
      'bigCatch',
      'maxWeightKg',
    ]),
  ];

  const { inScopeButUnmodeled, outsideCalculatorScope } = buildPublicEntryGaps(
    fishSheetRows,
    indexFishRows,
  );

  return {
    checkedAt: new Date().toISOString(),
    summary: {
      modeledFishCount: FISH_DATA.length,
      publicFishCount: fishSheetRows.length,
      inScopeButUnmodeledCount: inScopeButUnmodeled.length,
      outsideCalculatorScopeCount: outsideCalculatorScope.length,
      modeledDiffCount: modeledDiffs.length,
      equipmentDiffCount: equipmentDiffs.length,
    },
    revisions: [indexRevision, rodsRevision, accessoriesRevision, enchantsRevision],
    inScopeButUnmodeled,
    outsideCalculatorScope,
    modeledDiffs,
    equipmentDiffs,
    formulaEvidence: buildFormulaEvidence(),
  };
}

async function main(): Promise<void> {
  const writeMode = process.argv.includes('--write');
  const checkMode = process.argv.includes('--check');

  if (!writeMode && !checkMode) {
    throw new Error('Use --write or --check');
  }

  const snapshot = await buildSnapshot();
  const serialized = await stableJson(snapshot);

  await mkdir(dirname(OUTPUT_PATH), { recursive: true });

  if (checkMode) {
    const current = await readFile(OUTPUT_PATH, 'utf8').catch(() => '');
    const currentSnapshot = current ? (JSON.parse(current) as SourceAuditSnapshot) : undefined;
    const comparableSnapshot = currentSnapshot
      ? {
          ...snapshot,
          checkedAt: currentSnapshot.checkedAt,
        }
      : snapshot;

    if (current !== (await stableJson(comparableSnapshot))) {
      console.error('Source audit snapshot is stale. Run: npm run sources:refresh');
      process.exitCode = 1;
      return;
    }
    process.stdout.write('Source audit snapshot is up to date.\n');
    return;
  }

  await writeFile(OUTPUT_PATH, serialized, 'utf8');
  process.stdout.write(`Wrote ${OUTPUT_PATH}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
