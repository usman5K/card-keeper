import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { setDoc, doc, getDoc, collection, addDoc, updateDoc } from 'firebase/firestore';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';

const PROJECT_ID = 'fuel-ledger-rules-test';
const rules = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');

const env = await initializeTestEnvironment({
  projectId: PROJECT_ID,
  firestore: { rules },
});

async function seed() {
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'organizations/org1'), {
      name: 'Fleet',
      ownerId: 'owner1',
      currency: 'PKR',
    });
    await setDoc(doc(db, 'organizations/org1/members/owner1'), {
      role: 'owner',
      status: 'active',
      email: 'owner@example.com',
      displayName: 'Owner',
      assignedCardIds: [],
    });
    await setDoc(doc(db, 'organizations/org1/members/member1'), {
      role: 'member',
      status: 'active',
      email: 'member@example.com',
      displayName: 'Member',
      assignedCardIds: [],
    });
  });
}

await env.clearFirestore();
await seed();

const owner = env.authenticatedContext('owner1', { email: 'owner@example.com' });
const member = env.authenticatedContext('member1', { email: 'member@example.com' });
const stranger = env.authenticatedContext('stranger', { email: 'other@example.com' });
const anon = env.unauthenticatedContext();

await assertSucceeds(getDoc(doc(owner.firestore(), 'organizations/org1')));
await assertSucceeds(getDoc(doc(member.firestore(), 'organizations/org1')));
await assertFails(getDoc(doc(stranger.firestore(), 'organizations/org1')));
await assertFails(getDoc(doc(anon.firestore(), 'organizations/org1')));

await assertSucceeds(
  addDoc(collection(owner.firestore(), 'organizations/org1/invites'), {
    email: 'invitee@example.com',
    invitedBy: 'owner1',
    status: 'pending',
    orgName: 'Fleet',
  }),
);

await assertFails(
  addDoc(collection(member.firestore(), 'organizations/org1/invites'), {
    email: 'x@example.com',
    invitedBy: 'member1',
    status: 'pending',
    orgName: 'Fleet',
  }),
);

await assertFails(
  setDoc(doc(member.firestore(), 'organizations/org1/cards/card1'), {
    name: 'Hack',
    status: 'active',
    last4: '9999',
  }),
);

await assertSucceeds(
  setDoc(doc(owner.firestore(), 'organizations/org1/cards/card1'), {
    name: 'Meezan',
    status: 'active',
    last4: '1234',
    issuer: 'Meezan',
  }),
);

await assertFails(getDoc(doc(member.firestore(), 'organizations/org1/cards/card1')));

await assertSucceeds(
  updateDoc(doc(owner.firestore(), 'organizations/org1/members/member1'), {
    assignedCardIds: ['card1'],
  }),
);

await assertSucceeds(getDoc(doc(member.firestore(), 'organizations/org1/cards/card1')));
await assertSucceeds(getDoc(doc(owner.firestore(), 'organizations/org1/cards/card1')));

await assertSucceeds(
  setDoc(doc(owner.firestore(), 'organizations/org1/cards/card2'), {
    name: 'Other',
    status: 'active',
    last4: '5678',
    issuer: '',
  }),
);
await assertFails(getDoc(doc(member.firestore(), 'organizations/org1/cards/card2')));

await assertFails(
  updateDoc(doc(member.firestore(), 'organizations/org1/members/member1'), {
    assignedCardIds: ['card1', 'card2'],
    role: 'member',
    status: 'active',
  }),
);

await assertSucceeds(
  setDoc(doc(owner.firestore(), 'organizations/org1/recharges/r1'), {
    cardId: 'card1',
    amount: 5000,
    createdBy: 'owner1',
    occurredAt: '2026-10-05T00:00:00.000Z',
  }),
);

await assertFails(
  setDoc(doc(member.firestore(), 'organizations/org1/recharges/r2'), {
    cardId: 'card1',
    amount: 100,
    createdBy: 'member1',
    occurredAt: '2026-10-05T00:00:00.000Z',
  }),
);

await assertSucceeds(getDoc(doc(member.firestore(), 'organizations/org1/recharges/r1')));

await assertSucceeds(
  setDoc(doc(owner.firestore(), 'organizations/org1/recharges/r3'), {
    cardId: 'card2',
    amount: 100,
    createdBy: 'owner1',
    occurredAt: '2026-10-05T00:00:00.000Z',
  }),
);
await assertFails(getDoc(doc(member.firestore(), 'organizations/org1/recharges/r3')));

await assertSucceeds(
  setDoc(doc(member.firestore(), 'organizations/org1/transactions/t1'), {
    type: 'FUEL',
    cardId: 'card1',
    userId: 'member1',
    createdBy: 'member1',
    amount: 1000,
    station: 'PSO',
    area: 'Gulberg',
    syncStatus: 'PENDING',
    requiresReview: false,
  }),
);

await assertFails(
  setDoc(doc(member.firestore(), 'organizations/org1/transactions/t2'), {
    type: 'FUEL',
    cardId: 'card2',
    userId: 'member1',
    createdBy: 'member1',
    amount: 1000,
    station: 'PSO',
    area: 'Gulberg',
    syncStatus: 'PENDING',
    requiresReview: false,
  }),
);

await assertSucceeds(
  setDoc(doc(owner.firestore(), 'organizations/org1/transactions/t3'), {
    type: 'FUEL',
    cardId: 'card2',
    userId: 'member1',
    createdBy: 'owner1',
    amount: 800,
    station: 'Shell',
    area: 'DHA',
    syncStatus: 'PENDING',
    requiresReview: false,
  }),
);

const fresh = env.authenticatedContext('newbie', { email: 'new@example.com' });
await assertSucceeds(
  setDoc(doc(fresh.firestore(), 'organizations/org2'), {
    name: 'New Co',
    ownerId: 'newbie',
    currency: 'PKR',
  }),
);
await assertSucceeds(
  setDoc(doc(fresh.firestore(), 'organizations/org2/members/newbie'), {
    role: 'owner',
    status: 'active',
    email: 'new@example.com',
    displayName: 'New',
    assignedCardIds: [],
  }),
);

await env.cleanup();
console.log('firestore rules tests ok');
