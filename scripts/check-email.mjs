import assert from 'node:assert/strict';

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

function emailsMatch(a, b) {
  return normalizeEmail(a) === normalizeEmail(b);
}

assert.equal(normalizeEmail('  Foo@Bar.COM '), 'foo@bar.com');
assert.equal(emailsMatch('A@B.com', 'a@b.com'), true);
assert.equal(emailsMatch('a@b.com', 'c@d.com'), false);

console.log('email helpers smoke ok');
