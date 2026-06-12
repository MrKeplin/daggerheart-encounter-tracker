/**
 * Pure logic for Daggerheart Encounter Tracker.
 * Loaded in the browser (window.DhTrackerLogic) and in Node tests.
 */
const DhTrackerLogic = (function () {
  const SAVE_VERSION = 2;
  const SAVE_CODE_PREFIX = 'DH1';
  const STATIC_OFFICIAL_FIELDS = [
    'desc', 'range', 'diceWeak', 'hordePerHp', 'minionCleave', 'summons',
    'damageType', 'type', 'features', 'motives', 'experiences'
  ];

  function isDefeated(adv) {
    return adv.currentHp <= 0;
  }

  function isMinion(adv) {
    return adv.type === 'Minion';
  }

  function isHorde(adv) {
    return adv.type === 'Horde' && adv.diceWeak;
  }

  function isHordeWeakened(adv) {
    return isHorde(adv) && adv.currentHp <= Math.floor(adv.maxHp / 2);
  }

  function getEffectiveDice(adv) {
    return isHordeWeakened(adv) ? adv.diceWeak : adv.dice;
  }

  function normalizeAdversary(adv) {
    if (!adv || typeof adv !== 'object') return adv;
    adv.maxHp = Math.max(1, parseInt(adv.maxHp, 10) || 1);
    const rawHp = adv.currentHp;
    adv.currentHp = rawHp == null
      ? adv.maxHp
      : Math.min(adv.maxHp, Math.max(0, parseInt(rawHp, 10) || 0));
    adv.maxStress = Math.max(0, parseInt(adv.maxStress, 10) || 0);
    adv.currentStress = Math.min(
      adv.maxStress,
      Math.max(0, parseInt(adv.currentStress, 10) || 0)
    );
    adv.major = Math.max(0, parseInt(adv.major, 10) || 0);
    adv.severe = Math.max(0, parseInt(adv.severe, 10) || 0);
    adv.statuses = Array.isArray(adv.statuses) ? adv.statuses : [];
    adv.features = Array.isArray(adv.features) ? adv.features : [];
    if (!adv.name) adv.name = 'Unknown';
    if (!adv.type) adv.type = 'Standard';
    if (!adv.tier) adv.tier = '1';
    if (adv.diff == null || adv.diff === '') adv.diff = 10;
    if (!adv.atk) adv.atk = '+0';
    if (!adv.weapon) adv.weapon = 'Strike';
    if (!adv.damageType) adv.damageType = 'Physical';
    if (!adv.dice) adv.dice = '1d6';
    if (!adv.motives) adv.motives = '';
    if (!adv.experiences) adv.experiences = '';
    if (adv.isCustom == null && adv.motives === 'Custom.' && adv.experiences === 'None' && !adv.templateKey) {
      adv.isCustom = true;
    }
    return adv;
  }

  function getTemplateForAdversary(adv, monsterManual) {
    if (!adv || adv.isCustom) return null;
    if (adv.templateKey && monsterManual[adv.templateKey]) {
      return monsterManual[adv.templateKey];
    }
    return Object.entries(monsterManual || {}).find(
      ([, t]) => t.name === adv.name && String(t.tier) === String(adv.tier)
    )?.[1] || null;
  }

  function syncOfficialFields(adv, monsterManual) {
    if (!adv || adv.isCustom) return adv;
    const template = getTemplateForAdversary(adv, monsterManual);
    if (!template) return adv;
    STATIC_OFFICIAL_FIELDS.forEach(field => {
      if (template[field] !== undefined) adv[field] = template[field];
    });
    if (adv.templateKey == null) {
      const key = Object.entries(monsterManual || {}).find(
        ([, t]) => t.name === adv.name && String(t.tier) === String(adv.tier)
      )?.[0];
      if (key) adv.templateKey = key;
    }
    return adv;
  }

  function prepareAdversary(adv, monsterManual, options) {
    const copy = normalizeAdversary(JSON.parse(JSON.stringify(adv)));
    if (!copy.isCustom) syncOfficialFields(copy, monsterManual);
    if (options && options.sanitizeFeatures) {
      copy.features = (copy.features || []).map(sanitizeFeatureHtml);
    }
    return copy;
  }

  function findOfficialNameCollision(name, tier, monsterManual) {
    if (!name || !monsterManual) return null;
    return Object.entries(monsterManual).find(
      ([, t]) => t.name === name && String(t.tier) === String(tier)
    )?.[0] || null;
  }

  function calculateHpLoss(rawDamage, major, severe) {
    if (rawDamage >= severe) return 3;
    if (rawDamage >= major) return 2;
    return 1;
  }

  function getMinionCleaveExtra(rawDamage, cleave) {
    if (!cleave || rawDamage < cleave) return 0;
    return Math.max(0, Math.floor(rawDamage / cleave) - 1);
  }

  function calculateThreatLevel(adversaries, partySize) {
    let threatScore = 0;
    (adversaries || []).filter(a => !isDefeated(a)).forEach(a => {
      if (a.type === 'Solo') threatScore += 4;
      else if (a.type === 'Minion') threatScore += 0.25;
      else threatScore += 1;
    });

    const ps = Math.max(1, parseInt(partySize, 10) || 4);
    if (threatScore === 0) return { label: 'NO THREAT', cssClass: '', color: '#aaa' };
    if (threatScore < ps - 1) return { label: 'TRIVIAL', cssClass: 'threat-trivial' };
    if (threatScore > ps + 1.5) return { label: 'DEADLY', cssClass: 'threat-deadly' };
    if (threatScore > ps) return { label: 'HARD', cssClass: 'threat-hard' };
    return { label: 'STANDARD', cssClass: 'threat-standard' };
  }

  function formatDamageType(type) {
    if (!type) return { label: 'PHY', cssClass: 'type-phy' };
    const normalized = String(type).toLowerCase();
    if (normalized.includes('physical/magic') || normalized.includes('phy/mag') || normalized.includes('both')) {
      return { label: 'PHY+MAG', cssClass: 'type-both' };
    }
    if (normalized === 'physical' || normalized === 'phy') return { label: 'PHY', cssClass: 'type-phy' };
    if (normalized === 'magic' || normalized === 'mag') return { label: 'MAG', cssClass: 'type-mag' };
    return { label: String(type).toUpperCase(), cssClass: 'type-misc' };
  }

  function utf8ToBase64(str) {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, 'utf8').toString('base64');
    }
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach(b => { binary += String.fromCharCode(b); });
    return btoa(binary);
  }

  function base64ToUtf8(b64) {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(b64, 'base64').toString('utf8');
    }
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  }

  function formatShareCode(b64) {
    const chunks = b64.replace(/=+$/, '').match(/.{1,4}/g) || [];
    return SAVE_CODE_PREFIX + '-' + chunks.join('-');
  }

  function normalizeShareCodeInput(input) {
    let s = input.trim().toUpperCase().replace(/[\s\r\n]/g, '');
    s = s.replace(/^DH1[-:]?/, '');
    s = s.replace(/-/g, '');
    s = s.replace(/\+/g, '-').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return s;
  }

  function sanitizeFeatureHtml(html) {
    if (html == null) return '';
    const allowed = new Set(['span', 'b', 'strong']);
    const doc = new DOMParser().parseFromString('<div>' + String(html) + '</div>', 'text/html');
    function walk(node) {
      if (node.nodeType === Node.TEXT_NODE) return node.textContent;
      if (node.nodeType !== Node.ELEMENT_NODE) return '';
      const tag = node.tagName.toLowerCase();
      if (!allowed.has(tag)) {
        return Array.from(node.childNodes).map(walk).join('');
      }
      const attrs = tag === 'span'
        ? Array.from(node.attributes)
          .filter(a => a.name === 'class' && /^[\w\s-]+$/.test(a.value))
          .map(a => ' class="' + a.value + '"')
          .join('')
        : '';
      const inner = Array.from(node.childNodes).map(walk).join('');
      return '<' + tag + attrs + '>' + inner + '</' + tag + '>';
    }
    return Array.from(doc.body.firstChild?.childNodes || []).map(walk).join('');
  }

  /** Node fallback when DOMParser is unavailable */
  function sanitizeFeatureHtmlNode(html) {
    if (html == null) return '';
    return String(html)
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<[^>]+>/g, m => {
        const tag = m.match(/^<\/?(\w+)/);
        if (!tag) return '';
        const name = tag[1].toLowerCase();
        if (name === 'span' || name === 'b' || name === 'strong') return m;
        return '';
      });
  }

  function sanitizeFeatureHtmlSafe(html) {
    if (typeof DOMParser !== 'undefined') return sanitizeFeatureHtml(html);
    return sanitizeFeatureHtmlNode(html);
  }

  function rollDiceExpr(expr, randomFn) {
    const rand = randomFn || (() => Math.random());
    const m = String(expr).match(/^(\d+)d(\d+)(?:\+(\d+))?$/i);
    if (!m) return parseInt(expr, 10) || 1;
    let total = 0;
    const num = parseInt(m[1], 10);
    const sides = parseInt(m[2], 10);
    for (let i = 0; i < num; i++) total += Math.floor(rand() * sides) + 1;
    return total + (parseInt(m[3], 10) || 0);
  }

  function migrateSaveData(parsed) {
    if (!parsed || typeof parsed !== 'object') return parsed;
    if (!parsed.saveVersion) parsed.saveVersion = 1;
    // Future migrations by version:
    // if (parsed.saveVersion < 2) { ... }
    parsed.saveVersion = SAVE_VERSION;
    return parsed;
  }

  return {
    SAVE_VERSION,
    SAVE_CODE_PREFIX,
    STATIC_OFFICIAL_FIELDS,
    isDefeated,
    isMinion,
    isHorde,
    isHordeWeakened,
    getEffectiveDice,
    normalizeAdversary,
    getTemplateForAdversary,
    syncOfficialFields,
    prepareAdversary,
    findOfficialNameCollision,
    calculateHpLoss,
    getMinionCleaveExtra,
    calculateThreatLevel,
    formatDamageType,
    utf8ToBase64,
    base64ToUtf8,
    formatShareCode,
    normalizeShareCodeInput,
    sanitizeFeatureHtml: sanitizeFeatureHtmlSafe,
    rollDiceExpr,
    migrateSaveData
  };
})();

if (typeof window !== 'undefined') window.DhTrackerLogic = DhTrackerLogic;
if (typeof module !== 'undefined' && module.exports) module.exports = DhTrackerLogic;
