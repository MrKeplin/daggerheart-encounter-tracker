/**
 * Build adversaries.js and adversaries-enrich.js from tier1-companion-source.txt
 * (Daggerheart Companion / SRD adversary extract).
 */
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'tier1-companion-source.txt');
const LEGACY = path.join(ROOT, 'tier1-adversaries.js');
const OUT_DB = path.join(ROOT, 'adversaries.js');
const OUT_ENRICH = path.join(ROOT, 'adversaries-enrich.js');

function normalizeText(s) {
  if (!s) return s;
  return s
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/\u201C/g, '"')
    .replace(/\u201D/g, '"')
    .replace(/\u2014/g, '-')
    .replace(/\u2013/g, '-')
    .replace(/fi sts/g, 'fists')
    .replace(/fi ts/g, 'fits')
    .replace(/confl ict/g, 'conflict')
    .replace(/fl ames/g, 'flames')
    .replace(/benefi ts/g, 'benefits')
    .replace(/Flickerfl y/g, 'Flickerfly')
    .replace(/fl ying/g, 'flying')
    .replace(/fi rst/g, 'first')
    .replace(/Refl exes/g, 'Reflexes')
    .replace(/aff ect/g, 'affect')
    .replace(/infi nitely/g, 'infinitely')
    .replace(/defi ant/g, 'defiant')
    .replace(/Defi lement/g, 'Defilement')
    .replace(/sanctifi ed/g, 'sanctified')
    .replace(/\bdamag\./g, 'damage.')
    .trim();
}

function slugify(name) {
  return normalizeText(name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

function jsString(s) {
  return JSON.stringify(normalizeText(s));
}

function loadLegacyKeys() {
  const map = {};
  if (!fs.existsSync(LEGACY)) return map;
  const text = fs.readFileSync(LEGACY, 'utf8');
  const re = /"([^"]+)":\s*\{[^}]*name:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    map[m[2]] = m[1];
  }
  return map;
}

function loadLegacyEnv() {
  const map = {};
  if (!fs.existsSync(LEGACY)) return map;
  const text = fs.readFileSync(LEGACY, 'utf8');
  const re = /"([^"]+)":\s*\{[^}]*env:\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    map[m[1]] = m[2];
  }
  return map;
}

const MANUAL_SUMMONS = {
  jk_lieutenant: [{ label: 'Summon 3 Lackeys', templateKey: 'jk_lackey', count: 3 }],
  petty_noble: [{ label: 'Summon Bladed Guards (1d4)', templateKey: 'bladed_guard', count: 4, dice: '1d4' }],
  pirate_captain: [{ label: 'Summon Pirate Raiders', templateKey: 'pirate_raiders', count: 1 }],
  green_ooze: [{ label: 'Split: 2 Tiny Green Oozes', templateKey: 'tiny_green_ooze', count: 2 }],
  red_ooze: [{ label: 'Split: 2 Tiny Red Oozes', templateKey: 'tiny_red_ooze', count: 2 }],
  arch_necromancer: [{ label: 'Summon Zombie Legion', templateKey: 'zombie_legion', count: 1 }],
  fallen_warlord_undefeated_champion: [{ label: 'Summon Shock Troops (2× PCs)', templateKey: 'fallen_shock_troop', count: 8, dice: '2*PC' }],
  realm_breaker: [{ label: 'Summon Shock Troop (per HP marked)', templateKey: 'fallen_shock_troop', count: 1 }]
};

const MANUAL_ENRICH = {
  zombie_pack: {
    desc: 'A group of shambling corpses instinctively moving together.',
    range: 'Melee',
    diceWeak: '1d4+2',
    hordePerHp: 2,
    features: [
      "<span class='cost-tag'>Reaction</span> <b>Horde</b>: When the Zombies have marked half or more of their HP, their standard attack deals 1d4+2 physical damage instead.",
      "<span class='cost-tag'>Reaction</span> <b>Overwhelm</b>: When the Zombies mark HP from an attack within Melee range, you can mark a Stress to make a standard attack against the attacker."
    ]
  }
};

const ENV_RULES = [
  [/jagged knife/i, 'Jagged Knife'],
  [/^(archer|bladed|head) guard$/i, 'Settlement Guards'],
  [/guard$/i, 'Settlement Guards'],
  [/(skeleton|zombie|vampire|spectral|necromancer)/i, 'Undead'],
  [/(hallowed|oracle|high seraph|seraph)/i, 'Divine & Oracles'],
  [/(ooze|oozes)/i, 'Oozes'],
  [/(treant|dryad|sylvan|stag knight|bramble)/i, 'Forest & Fae'],
  [/(elemental|chaos skull|construct|battle box|failed experiment|war wizard|stonewraith)/i, 'Arcane Threats'],
  [/(demon|demonic)/i, 'Demons'],
  [/(pirate)/i, 'Pirates'],
  [/(cult|secret-keeper)/i, 'Cult'],
  [/(assassin|masked thief|spy)/i, 'Criminal Underworld'],
  [/(knight of the realm|royal advisor|monarch|merchant baron|courtesan|courtier|petty noble)/i, 'Nobility & Court'],
  [/(merchant|sellsword|harrier|weaponmaster|spellblade|conscript|elite soldier|archer squadron)/i, 'Social & Mercenaries'],
  [/(giant (beastmaster|brawler|recruit|eagle)|minotaur)/i, 'Giants'],
  [/(flickerfly|hydra|dire bat|gorgon|kraken|shark|electric eel|adult flickerfly|juvenile flickerfly|young ice dragon|volcanic dragon)/i, 'Beasts & Solos'],
  [/(bear|wolf|scorpion|snake|rat|mosquito|eagle)/i, 'Beasts & Wilderness'],
  [/(fallen|realm-breaker|realm breaker)/i, 'The Fallen'],
  [/(outer realms)/i, 'Outer Realms'],
  [/(vault guardian)/i, 'Vault Guardians'],
  [/(siren)/i, 'Mythic Sea'],
  [/(mortal hunter)/i, 'Hunters'],
];

function inferEnv(name, key, legacyEnv) {
  if (legacyEnv[key]) return legacyEnv[key];
  for (const [re, env] of ENV_RULES) {
    if (re.test(name)) return env;
  }
  return 'General';
}

function getCostTag(line) {
  if (/Spend (\d+) Fear/i.test(line)) {
    const n = line.match(/Spend (\d+) Fear/i)[1];
    return `<span class='cost-tag fear'>${n} Fear</span> `;
  }
  if (/Mark 2 Stress/i.test(line)) return "<span class='cost-tag stress'>2 Stress</span> ";
  if (/Mark a Stress/i.test(line)) return "<span class='cost-tag stress'>1 Stress</span> ";
  if (/Mark an? HP/i.test(line)) return "<span class='cost-tag stress'>Mark HP</span> ";
  if (/^When the|^When a|^When they|^When /i.test(line) || /Reaction:/i.test(line)) {
    return "<span class='cost-tag'>Reaction</span> ";
  }
  if (/Spend a Fear|^Spend Fear|^Spend \d/i.test(line)) {
    return "<span class='cost-tag fear'>1 Fear</span> ";
  }
  if (/Make an attack|^Make a /i.test(line) || /Action:/i.test(line)) {
    return "<span class='cost-tag'>Action</span> ";
  }
  return "<span class='cost-tag'>Passive</span> ";
}

function parseFeatures(block) {
  const items = [];
  for (const rawLine of block.split(/\r?\n/)) {
    const line = normalizeText(rawLine.trim());
    if (!line) continue;
    const m = line.match(/^([^:]+):\s*(.+)$/);
    if (!m) continue;
    const featName = m[1].trim();
    const featBody = m[2].trim();
    const tag = getCostTag(`${featName}: ${featBody}`);
    items.push(`${tag}<b>${featName}</b>: ${featBody}`);
  }
  return items;
}

function parseDamageType(token) {
  const t = token.toLowerCase();
  if (t.includes('phy/mag') || t.includes('/')) return 'Physical/Magic';
  if (t.startsWith('mag')) return 'Magic';
  return 'Physical';
}

function parseAttackLine(line) {
  const m = line.match(/^(.+?):\s*([+-]?\d+)\s+(Melee|Very Close|Close|Far|Very Far)\s+(\d+d\d+(?:\+\d+)?|\d+)\s+(\w+(?:\/\w+)?)/i);
  if (!m) return null;
  return {
    weapon: normalizeText(m[1].trim()),
    atk: m[2].startsWith('+') || m[2].startsWith('-') ? m[2] : `+${m[2]}`,
    range: m[3],
    dice: m[4],
    damageType: parseDamageType(m[5])
  };
}

function parseHordeMeta(typeLine, features) {
  const hordeMatch = typeLine.match(/Horde\s*\((\d+)\/HP\)/i);
  if (!hordeMatch) return null;
  const hordePerHp = parseInt(hordeMatch[1], 10);
  let diceWeak = null;
  for (const f of features) {
    const m = f.match(/standard attack deals?\s+(\d+d\d+(?:\+\d+)?)/i);
    if (m) {
      diceWeak = m[1];
      break;
    }
  }
  return { hordePerHp, diceWeak };
}

function parseMinionCleave(features) {
  for (const f of features) {
    const m = f.match(/For every (\d+) damage/i);
    if (m) return parseInt(m[1], 10);
  }
  return null;
}

function parseCompanion(text) {
  const legacyKeys = loadLegacyKeys();
  const legacyEnv = loadLegacyEnv();
  const sections = text.split(/^## Tier (\d+)\s*$/m);
  const adversaries = [];

  for (let i = 1; i < sections.length; i += 2) {
    const tier = sections[i];
    const body = sections[i + 1];
    const blocks = body.split(/^### /m).slice(1);
    for (const block of blocks) {
      const lines = block.split(/\r?\n/);
      const name = normalizeText(lines[0].trim());
      if (!name) continue;

      const rest = lines.slice(1).join('\n');
      const descMatch = rest.match(/^\s*\n([^\n]+)\n\s*\nType:/m);
      const desc = descMatch ? normalizeText(descMatch[1]) : '';

      const typeMatch = rest.match(/^Type:\s*(.+)$/m);
      const rawType = typeMatch ? typeMatch[1].trim() : 'Standard';
      const hordeMeta = rawType.match(/Horde/i);
      const type = hordeMeta
        ? 'Horde'
        : normalizeText(rawType.replace(/\s*\([^)]*\)\s*/g, '').trim());

      const motivesMatch = rest.match(/^Motives & Tactics:\s*(.+)$/m);
      const motives = motivesMatch ? normalizeText(motivesMatch[1]) : '';

      const expMatch = rest.match(/^Experiences:[ \t]*([^\n]*)$/m);
      let experiences = expMatch ? normalizeText(expMatch[1]) : '';
      if (/^Difficulty:/i.test(experiences)) experiences = '';

      const diffMatch = rest.match(/Difficulty:\s*(\d+)\s*\|\s*Thresholds:\s*([^|\n]+)/);
      const diff = diffMatch ? parseInt(diffMatch[1], 10) : 10;
      let major = 0;
      let severe = 0;
      if (diffMatch && !/none/i.test(diffMatch[2])) {
        const parts = diffMatch[2].trim().split('/');
        major = parseInt(parts[0], 10) || 0;
        severe = parseInt(parts[1], 10) || 0;
      }

      const hpMatch = rest.match(/HP:\s*(\d+)\s*\|\s*Stress:\s*(\d+)/);
      const maxHp = hpMatch ? parseInt(hpMatch[1], 10) : 1;
      const maxStress = hpMatch ? parseInt(hpMatch[2], 10) : 0;

      let attack = null;
      for (const line of lines) {
        const trimmed = normalizeText(line.trim());
        if (/^(Difficulty|HP|Type|Motives|Experiences|####)/.test(trimmed)) continue;
        if (/^[^:]+:\s*[+-]?\d+\s+(Melee|Very Close|Close|Far)/i.test(trimmed)) {
          attack = parseAttackLine(trimmed);
          if (attack) break;
        }
      }

      const featMatch = rest.match(/#### Features\r?\n([\s\S]*?)(?=\r?\n### |\r?\n## Tier |$)/);
      const featureTexts = featMatch ? parseFeatures(featMatch[1]) : [];

      const key = legacyKeys[name] || slugify(name);
      const env = inferEnv(name, key, legacyEnv);

      const entry = {
        key,
        env,
        name,
        tier: String(tier),
        type,
        diff,
        atk: attack?.atk || '+0',
        maxHp,
        maxStress,
        major,
        severe,
        weapon: attack?.weapon || 'Strike',
        damageType: attack?.damageType || 'Physical',
        dice: attack?.dice || '1d6',
        motives,
        experiences,
        features: featureTexts,
        desc,
        range: attack?.range || 'Melee'
      };

      const horde = parseHordeMeta(rawType, featureTexts);
      if (horde) {
        entry.hordePerHp = horde.hordePerHp;
        if (horde.diceWeak) entry.diceWeak = horde.diceWeak;
      }

      const cleave = parseMinionCleave(featureTexts);
      if (cleave) entry.minionCleave = cleave;

      if (/phy\/mag/i.test(rest) || /physical and magic/i.test(featureTexts.join(' '))) {
        entry.damageType = 'Physical/Magic';
      }

      adversaries.push(entry);
    }
  }

  return adversaries;
}

function renderDatabase(adversaries) {
  const counts = adversaries.reduce((acc, a) => {
    acc[a.tier] = (acc[a.tier] || 0) + 1;
    return acc;
  }, {});

  const lines = [
    `// OFFICIAL ADVERSARY DATABASE (${adversaries.length} entries - Daggerheart Companion/SRD)`,
    `// Tier breakdown: ${Object.keys(counts).sort().map(t => `T${t}=${counts[t]}`).join(', ')}`,
    'const monsterManual = {'
  ];

  adversaries.forEach((a, idx) => {
    const { key, desc, range, hordePerHp, diceWeak, minionCleave, summons, ...core } = a;
    const props = [
      `env: ${jsString(core.env)}`,
      `name: ${jsString(core.name)}`,
      `tier: ${jsString(core.tier)}`,
      `type: ${jsString(core.type)}`,
      `diff: ${core.diff}`,
      `atk: ${jsString(core.atk)}`,
      `maxHp: ${core.maxHp}`,
      `maxStress: ${core.maxStress}`,
      `major: ${core.major}`,
      `severe: ${core.severe}`,
      `weapon: ${jsString(core.weapon)}`,
      `damageType: ${jsString(core.damageType)}`,
      `dice: ${jsString(core.dice)}`,
      `motives: ${jsString(core.motives)}`,
      `experiences: ${jsString(core.experiences)}`,
      `features: [${core.features.map(jsString).join(', ')}]`
    ];
    const comma = idx < adversaries.length - 1 ? ',' : '';
    lines.push(`  ${jsString(key)}: { ${props.join(', ')} }${comma}`);
  });

  lines.push('};');
  return lines.join('\n') + '\n';
}

function renderEnrich(adversaries) {
  const lines = [
    '// Auto-enrichment: desc, range, horde/minion metadata, full SRD features',
    '(function enrichMonsterManual() {',
    '  const patch = {'
  ];

  adversaries.forEach((a, idx) => {
    const manual = { ...(MANUAL_ENRICH[a.key] || {}), summons: MANUAL_SUMMONS[a.key] };
    const parts = [];
    const desc = manual.desc || a.desc;
    const range = manual.range || a.range;
    const diceWeak = manual.diceWeak || a.diceWeak;
    const hordePerHp = manual.hordePerHp || a.hordePerHp;
    const minionCleave = manual.minionCleave || a.minionCleave;
    const features = manual.features || a.features;
    const summons = manual.summons;
    if (desc) parts.push(`desc: ${jsString(desc)}`);
    parts.push(`range: ${jsString(range)}`);
    if (diceWeak) parts.push(`diceWeak: ${jsString(diceWeak)}`);
    if (hordePerHp) parts.push(`hordePerHp: ${hordePerHp}`);
    if (minionCleave) parts.push(`minionCleave: ${minionCleave}`);
    if (summons) {
      parts.push(`summons: [${summons.map(s => {
        const extra = s.dice ? `, dice: ${jsString(s.dice)}` : '';
        return `{ label: ${jsString(s.label)}, templateKey: ${jsString(s.templateKey)}, count: ${s.count}${extra} }`;
      }).join(', ')}]`);
    }
    if (features.length) parts.push(`features: [${features.map(jsString).join(', ')}]`);
    const comma = idx < adversaries.length - 1 ? ',' : '';
    lines.push(`    ${jsString(a.key)}: { ${parts.join(', ')} }${comma}`);
  });

  lines.push(
    '  };',
    '  for (const [key, data] of Object.entries(patch)) {',
    '    if (monsterManual[key]) Object.assign(monsterManual[key], data);',
    '  }',
    '})();',
    ''
  );
  return lines.join('\n');
}

function loadLegacyOnlyEntries() {
  if (!fs.existsSync(LEGACY)) return [];
  const text = fs.readFileSync(LEGACY, 'utf8');
  const entries = [];
  const re = /"([^"]+)":\s*\{([^}]+)\}/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const key = m[1];
    const body = m[2];
    const pick = (field, strRe) => {
      const fm = body.match(strRe);
      return fm ? fm[1] : undefined;
    };
    entries.push({
      key,
      env: pick('env', /env:\s*"([^"]+)"/),
      name: pick('name', /name:\s*"([^"]+)"/),
      tier: pick('tier', /tier:\s*"([^"]+)"/),
      type: pick('type', /type:\s*"([^"]+)"/),
      diff: parseInt(pick('diff', /diff:\s*(\d+)/), 10),
      atk: pick('atk', /atk:\s*"([^"]+)"/),
      maxHp: parseInt(pick('maxHp', /maxHp:\s*(\d+)/), 10),
      maxStress: parseInt(pick('maxStress', /maxStress:\s*(\d+)/), 10),
      major: parseInt(pick('major', /major:\s*(\d+)/), 10),
      severe: parseInt(pick('severe', /severe:\s*(\d+)/), 10),
      weapon: pick('weapon', /weapon:\s*"([^"]+)"/),
      damageType: pick('damageType', /damageType:\s*"([^"]+)"/),
      dice: pick('dice', /dice:\s*"([^"]+)"/),
      motives: pick('motives', /motives:\s*"([^"]+)"/),
      experiences: pick('experiences', /experiences:\s*'([^']*)'|experiences:\s*"([^"]*)"/),
      features: [],
      desc: '',
      range: 'Melee',
      hordePerHp: parseInt(pick('hordePerHp', /hordePerHp:\s*(\d+)/), 10) || undefined,
      diceWeak: pick('diceWeak', /diceWeak:\s*"([^"]+)"/),
      minionCleave: parseInt(pick('minionCleave', /minionCleave:\s*(\d+)/), 10) || undefined
    });
  }
  return entries.map(e => ({
    ...e,
    experiences: e.experiences || ''
  }));
}

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error('Missing tier1-companion-source.txt');
    process.exit(1);
  }

  const text = fs.readFileSync(SOURCE, 'utf8');
  let adversaries = parseCompanion(text);
  const builtNames = new Set(adversaries.map(a => a.name));
  for (const legacy of loadLegacyOnlyEntries()) {
    if (!builtNames.has(legacy.name)) {
      adversaries.push(legacy);
      builtNames.add(legacy.name);
    }
  }
  adversaries.sort((a, b) => {
    const tierDiff = parseInt(a.tier, 10) - parseInt(b.tier, 10);
    if (tierDiff !== 0) return tierDiff;
    return a.name.localeCompare(b.name);
  });

  const tierCounts = adversaries.reduce((acc, a) => {
    acc[a.tier] = (acc[a.tier] || 0) + 1;
    return acc;
  }, {});

  fs.writeFileSync(OUT_DB, renderDatabase(adversaries), 'utf8');
  fs.writeFileSync(OUT_ENRICH, renderEnrich(adversaries), 'utf8');

  console.log(`Built ${adversaries.length} adversaries -> adversaries.js, adversaries-enrich.js`);
  console.log('By tier:', tierCounts);
}

main();
