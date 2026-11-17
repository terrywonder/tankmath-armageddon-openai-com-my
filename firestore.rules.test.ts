import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rules = fs.readFileSync('firestore.rules', 'utf8');
const blueprint = JSON.parse(fs.readFileSync('firebase-blueprint.json', 'utf8'));

test('firestore.rules enforces default-deny catch-all and covers every blueprint collection', () => {
  assert.ok(rules.includes("rules_version = '2';"));
  assert.ok(rules.includes('match /{document=**} {\n      allow read, write: if false;\n    }'));
  for (const path of Object.keys(blueprint.firestore)) {
    const collection = path.split('/')[1];
    assert.ok(rules.includes(`match /${collection}/`), `Missing match block for ${collection}`);
  }
});

test('firestore.rules satisfies Dirty Dozen security invariants', () => {
  assert.ok(rules.includes('request.auth.token.email_verified == true'), 'Must require verified email');
  assert.ok(rules.includes('isValidPlayerSave(incoming())'), 'Save writes must run validator');
  assert.ok(rules.includes('isValidLeaderboardEntry(incoming())'), 'Leaderboard writes must run validator');
  assert.ok(rules.includes('allow list: if false;'), 'Saves listing must be disabled');
  assert.ok(rules.includes('incoming().createdAt == request.time'), 'Create timestamp must match request.time');
  assert.ok(rules.includes('incoming().createdAt == existing().createdAt'), 'createdAt must be immutable');
  assert.ok(rules.includes('affectedKeys().hasOnly('), 'Update must whitelist affected keys');
  assert.ok(rules.includes('isValidWeaponUpgradesMap('), 'Must validate weaponUpgrades map structure');
  assert.ok(rules.includes("keys().hasAll(['standard', 'cluster', 'mortar'])"), 'Must enforce exact weapon keys');
  assert.ok(rules.includes('data.credits is int && data.credits >= 0'), 'Must validate integer credits');
});
