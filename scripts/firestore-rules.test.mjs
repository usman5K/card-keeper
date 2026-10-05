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

await assertSucceeds(
  setDoc(doc(member.firestore(), 'organizations/org1/settlements/s1'), {
    userId: 'member1',
    amount: 500,
    method: 'cash',
    status: 'pending',
    createdBy: 'member1',
    occurredAt: '2026-10-05T12:00:00.000Z',
  }),
);

await assertFails(
  setDoc(doc(member.firestore(), 'organizations/org1/settlements/s2'), {
    userId: 'owner1',
    amount: 500,
    method: 'cash',
    status: 'pending',
    createdBy: 'member1',
    occurredAt: '2026-10-05T12:00:00.000Z',
  }),
);

await assertFails(
  setDoc(doc(member.firestore(), 'organizations/org1/settlements/s3'), {
    userId: 'member1',
    amount: 500,
    method: 'cash',
    status: 'confirmed',
    createdBy: 'member1',
    confirmedBy: 'member1',
    occurredAt: '2026-10-05T12:00:00.000Z',
  }),
);

await assertSucceeds(
  setDoc(doc(owner.firestore(), 'organizations/org1/settlements/s4'), {
    userId: 'member1',
    amount: 700,
    method: 'bank',
    status: 'confirmed',
    createdBy: 'owner1',
    confirmedBy: 'owner1',
    occurredAt: '2026-10-05T13:00:00.000Z',
  }),
);

await assertSucceeds(
  updateDoc(doc(owner.firestore(), 'organizations/org1/settlements/s1'), {
    status: 'confirmed',
    confirmedBy: 'owner1',
    amount: 450,
    method: 'cash',
  }),
);

await assertFails(
  updateDoc(doc(member.firestore(), 'organizations/org1/settlements/s4'), {
    status: 'confirmed',
    confirmedBy: 'member1',
  }),
);

await assertFails(
  updateDoc(doc(owner.firestore(), 'organizations/org1/settlements/s4'), {
    amount: 1,
  }),
);

await assertSucceeds(getDoc(doc(member.firestore(), 'organizations/org1/settlements/s4')));

await assertSucceeds(
  setDoc(doc(owner.firestore(), 'organizations/org1/adjustments/a1'), {
    cardId: 'card1',
    amount: 10000,
    reason: 'Opening balance',
    kind: 'OPENING',
    createdBy: 'owner1',
    occurredAt: '2026-10-05T00:00:00.000Z',
  }),
);

await assertSucceeds(getDoc(doc(member.firestore(), 'organizations/org1/adjustments/a1')));

await assertFails(
  setDoc(doc(member.firestore(), 'organizations/org1/adjustments/a2'), {
    cardId: 'card1',
    amount: 500,
    reason: 'Member correction',
    kind: 'CORRECTION',
    createdBy: 'member1',
    occurredAt: '2026-10-05T00:00:00.000Z',
  }),
);

await assertSucceeds(
  setDoc(doc(owner.firestore(), 'organizations/org1/adjustments/a3'), {
    cardId: 'card1',
    amount: 800,
    reason: 'Reverse fuel',
    kind: 'REVERSAL',
    linkedTxId: 't1',
    createdBy: 'owner1',
    occurredAt: '2026-10-05T14:00:00.000Z',
  }),
);

await assertSucceeds(
  setDoc(doc(owner.firestore(), 'organizations/org1/adjustments/a4'), {
    cardId: 'card1',
    amount: -5000,
    reason: 'Reverse recharge',
    kind: 'REVERSAL',
    linkedTxId: 'r1',
    createdBy: 'owner1',
    occurredAt: '2026-10-05T15:00:00.000Z',
  }),
);

await assertFails(
  setDoc(doc(owner.firestore(), 'organizations/org1/adjustments/a5'), {
    cardId: 'card1',
    amount: -100,
    reason: 'Bad opening',
    kind: 'OPENING',
    createdBy: 'owner1',
    occurredAt: '2026-10-05T00:00:00.000Z',
  }),
);

await assertFails(
  updateDoc(doc(owner.firestore(), 'organizations/org1/adjustments/a1'), {
    amount: 1,
  }),
);

await assertSucceeds(
  setDoc(doc(owner.firestore(), 'organizations/org1/adjustments/a6'), {
    cardId: 'card2',
    amount: 200,
    reason: 'Other card',
    kind: 'CORRECTION',
    createdBy: 'owner1',
    occurredAt: '2026-10-05T16:00:00.000Z',
  }),
);
await assertFails(getDoc(doc(member.firestore(), 'organizations/org1/adjustments/a6')));

await env.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();
  await setDoc(doc(db, 'organizations/org1/transactions/conflict1'), {
    type: 'FUEL',
    cardId: 'card1',
    userId: 'member1',
    createdBy: 'member1',
    amount: 5000,
    station: 'PSO',
    area: 'Gulberg',
    syncStatus: 'CONFLICT',
    requiresReview: true,
    occurredAt: '2026-10-05T18:00:00.000Z',
  });
});

await assertSucceeds(
  updateDoc(doc(owner.firestore(), 'organizations/org1/transactions/conflict1'), {
    requiresReview: false,
    reviewedBy: 'owner1',
    reviewedAt: '2026-10-05T19:00:00.000Z',
    reviewAction: 'acknowledge',
  }),
);

await assertFails(
  updateDoc(doc(member.firestore(), 'organizations/org1/transactions/t1'), {
    requiresReview: false,
    reviewedBy: 'member1',
    reviewedAt: '2026-10-05T19:00:00.000Z',
    reviewAction: 'acknowledge',
  }),
);

await env.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();
  await setDoc(doc(db, 'organizations/org1/transactions/conflict2'), {
    type: 'FUEL',
    cardId: 'card1',
    userId: 'member1',
    createdBy: 'member1',
    amount: 4000,
    station: 'Shell',
    area: 'DHA',
    syncStatus: 'CONFLICT',
    requiresReview: true,
    occurredAt: '2026-10-05T20:00:00.000Z',
  });
});

await assertFails(
  updateDoc(doc(owner.firestore(), 'organizations/org1/transactions/conflict2'), {
    requiresReview: false,
    reviewedBy: 'owner1',
    reviewedAt: '2026-10-05T21:00:00.000Z',
    reviewAction: 'acknowledge',
    amount: 1,
  }),
);

await env.cleanup();
console.log('firestore rules tests ok');
