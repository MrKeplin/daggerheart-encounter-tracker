const test = require('node:test');
const assert = require('node:assert/strict');
const L = require('./tracker-logic.js');

const monsterManual = {
  bear: {
    name: 'Bear',
    tier: '1',
    type: 'Bruiser',
    features: ['<span class="cost-tag">Passive</span> <b>Claw</b>: scratch'],
    motives: 'official motives'
  }
};

test('normalizeAdversary fills missing HP and clamps values', () => {
  const adv = L.normalizeAdversary({ maxHp: 5 });
  assert.equal(adv.currentHp, 5);
  assert.deepEqual(adv.statuses, []);
  assert.deepEqual(adv.features, []);
});

test('normalizeAdversary clamps current HP to max', () => {
  const adv = L.normalizeAdversary({ maxHp: 4, currentHp: 99, currentStress: 5, maxStress: 2 });
  assert.equal(adv.currentHp, 4);
  assert.equal(adv.currentStress, 2);
});

test('custom adversaries skip syncOfficialFields', () => {
  const adv = L.syncOfficialFields(
    { isCustom: true, name: 'Bear', tier: '1', features: ['custom feat'], motives: 'mine' },
    monsterManual
  );
  assert.equal(adv.motives, 'mine');
  assert.deepEqual(adv.features, ['custom feat']);
});

test('official adversaries sync static fields from manual', () => {
  const adv = L.syncOfficialFields(
    { name: 'Bear', tier: '1', features: [], motives: 'old' },
    monsterManual
  );
  assert.equal(adv.motives, 'official motives');
  assert.equal(adv.features.length, 1);
});

test('calculateHpLoss uses major and severe thresholds', () => {
  assert.equal(L.calculateHpLoss(5, 8, 15), 1);
  assert.equal(L.calculateHpLoss(8, 8, 15), 2);
  assert.equal(L.calculateHpLoss(15, 8, 15), 3);
});

test('getMinionCleaveExtra', () => {
  assert.equal(L.getMinionCleaveExtra(6, 3), 1);
  assert.equal(L.getMinionCleaveExtra(2, 3), 0);
});

test('isHordeWeakened at half HP', () => {
  const horde = { type: 'Horde', diceWeak: '1d4+1', maxHp: 6, currentHp: 3, dice: '1d8+3' };
  assert.equal(L.isHordeWeakened(horde), true);
  assert.equal(L.getEffectiveDice(horde), '1d4+1');
});

test('calculateThreatLevel', () => {
  const advs = [
    { type: 'Minion', currentHp: 1 },
    { type: 'Solo', currentHp: 5 },
    { type: 'Standard', currentHp: 0 }
  ];
  const deadly = L.calculateThreatLevel(advs, 4);
  assert.equal(deadly.label, 'DEADLY');
});

test('share code round-trip', () => {
  const payload = { v: 1, fearTokens: 2, adversaries: [] };
  const json = JSON.stringify(payload);
  const code = L.formatShareCode(L.utf8ToBase64(json));
  const restored = JSON.parse(L.base64ToUtf8(L.normalizeShareCodeInput(code)));
  assert.equal(restored.fearTokens, 2);
});

test('normalizeShareCodeInput strips prefix and dashes', () => {
  const input = 'DH1-QUJD-LERT';
  const b64 = L.normalizeShareCodeInput(input);
  assert.match(b64, /^[A-Za-z0-9+/=]+$/);
});

test('sanitizeFeatureHtml strips scripts and unknown tags', () => {
  const clean = L.sanitizeFeatureHtml('<span class="cost-tag fear">1 Fear</span> <script>alert(1)</script><b>Hit</b><img onerror=1>');
  assert.match(clean, /<span class="cost-tag fear">1 Fear<\/span>/);
  assert.match(clean, /<b>Hit<\/b>/);
  assert.doesNotMatch(clean, /script/i);
  assert.doesNotMatch(clean, /img/i);
});

test('rollDiceExpr with fixed random', () => {
  const total = L.rollDiceExpr('2d6+1', () => 0.999);
  assert.equal(total, 13);
});

test('migrateSaveData sets save version', () => {
  const migrated = L.migrateSaveData({ fearTokens: 1 });
  assert.equal(migrated.saveVersion, L.SAVE_VERSION);
});

test('findOfficialNameCollision', () => {
  assert.equal(L.findOfficialNameCollision('Bear', '1', monsterManual), 'bear');
  assert.equal(L.findOfficialNameCollision('Custom Guy', '1', monsterManual), null);
});
