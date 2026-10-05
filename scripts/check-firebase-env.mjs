import assert from 'node:assert/strict';

const REQUIRED_KEYS = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
];

function isConfigured(source) {
  return REQUIRED_KEYS.every((key) => Boolean(source[key]?.trim()));
}

function missingKeys(source) {
  return REQUIRED_KEYS.filter((key) => !source[key]?.trim());
}

assert.equal(isConfigured({}), false);
assert.deepEqual(missingKeys({}), REQUIRED_KEYS);

const filled = Object.fromEntries(REQUIRED_KEYS.map((key) => [key, `value-for-${key}`]));
assert.equal(isConfigured(filled), true);
assert.deepEqual(missingKeys(filled), []);

assert.equal(isConfigured({ ...filled, EXPO_PUBLIC_FIREBASE_API_KEY: '  ' }), false);

console.log('firebase env smoke ok');
