import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  setDoc,
  doc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
} from 'firebase/firestore';
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

await assertFails(
  updateDoc(doc(owner.firestore(), 'organizations/org1/cards/card1'), {
    pin: '1234',
  }),
);

await assertSucceeds(
  setDoc(doc(owner.firestore(), 'organizations/org1/cards/card1/secrets/pin'), {
    value: '4321',
    updatedAt: Timestamp.now(),
  }),
);

await assertSucceeds(getDoc(doc(owner.firestore(), 'organizations/org1/cards/card1/secrets/pin')));
await assertFails(getDoc(doc(member.firestore(), 'organizations/org1/cards/card1/secrets/pin')));

await assertFails(
  setDoc(doc(member.firestore(), 'organizations/org1/pinRequests/card1_member1'), {
    cardId: 'card1',
    requestedBy: 'member1',
    status: 'pending',
    pin: '4321',
  }),
);

await assertSucceeds(
  setDoc(doc(member.firestore(), 'organizations/org1/pinRequests/card1_member1'), {
    cardId: 'card1',
    requestedBy: 'member1',
    status: 'pending',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }),
);

await assertFails(
  setDoc(doc(member.firestore(), 'organizations/org1/pinRequests/card2_member1'), {
    cardId: 'card2',
    requestedBy: 'member1',
    status: 'pending',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }),
);

await assertFails(
  updateDoc(doc(member.firestore(), 'organizations/org1/pinRequests/card1_member1'), {
    status: 'approved',
    resolvedBy: 'member1',
    resolvedAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
    updatedAt: Timestamp.now(),
  }),
);

await assertSucceeds(
  updateDoc(doc(owner.firestore(), 'organizations/org1/pinRequests/card1_member1'), {
    status: 'approved',
    resolvedBy: 'owner1',
    resolvedAt: Timestamp.now(),
    expiresAt: Timestamp.fromMillis(Date.now() + 60_000),
    updatedAt: Timestamp.now(),
  }),
);

await assertSucceeds(getDoc(doc(member.firestore(), 'organizations/org1/cards/card1/secrets/pin')));

await assertSucceeds(
  setDoc(doc(owner.firestore(), 'organizations/org1/auditLogs/pin1'), {
    actorId: 'owner1',
    action: 'PIN_APPROVE',
    entityType: 'pinRequest',
    entityId: 'card1_member1',
    metadata: { cardId: 'card1', requestedBy: 'member1', status: 'approved' },
    createdAt: Timestamp.now(),
  }),
);

await assertFails(
  setDoc(doc(owner.firestore(), 'organizations/org1/auditLogs/pin2'), {
    actorId: 'owner1',
    action: 'PIN_APPROVE',
    entityType: 'pinRequest',
    entityId: 'card1_member1',
    metadata: { pin: '4321' },
    createdAt: Timestamp.now(),
  }),
);

await assertSucceeds(
  setDoc(doc(owner.firestore(), 'organizations/org1/auditLogs/fuel1'), {
    actorId: 'owner1',
    action: 'FUEL_CREATE',
    entityType: 'fuel',
    entityId: 'tx1',
    metadata: { cardId: 'card1', amount: 500, station: 'PSO' },
    createdAt: Timestamp.now(),
  }),
);

await assertSucceeds(
  setDoc(doc(member.firestore(), 'organizations/org1/auditLogs/fuel2'), {
    actorId: 'member1',
    action: 'FUEL_CREATE',
    entityType: 'fuel',
    entityId: 'tx2',
    metadata: { cardId: 'card1', amount: 200 },
    createdAt: Timestamp.now(),
  }),
);

await assertSucceeds(
  setDoc(doc(owner.firestore(), 'organizations/org1/auditLogs/conflict1'), {
    actorId: 'owner1',
    action: 'CONFLICT_ACKNOWLEDGE',
    entityType: 'transaction',
    entityId: 'tx1',
    metadata: { reviewAction: 'acknowledge' },
    createdAt: Timestamp.now(),
  }),
);

await assertFails(
  setDoc(doc(member.firestore(), 'organizations/org1/auditLogs/badActor'), {
    actorId: 'owner1',
    action: 'FUEL_CREATE',
    entityType: 'fuel',
    entityId: 'tx3',
    metadata: {},
    createdAt: Timestamp.now(),
  }),
);

await assertSucceeds(getDoc(doc(owner.firestore(), 'organizations/org1/auditLogs/fuel1')));
await assertFails(getDoc(doc(member.firestore(), 'organizations/org1/auditLogs/fuel1')));
await assertFails(getDoc(doc(stranger.firestore(), 'organizations/org1/auditLogs/fuel1')));

await env.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();
  await setDoc(doc(db, 'organizations/org1/pinRequests/card1_member1'), {
    cardId: 'card1',
    requestedBy: 'member1',
    status: 'approved',
    resolvedBy: 'owner1',
    expiresAt: Timestamp.fromMillis(Date.now() - 60_000),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
});

await assertFails(getDoc(doc(member.firestore(), 'organizations/org1/cards/card1/secrets/pin')));

await assertSucceeds(
  setDoc(doc(owner.firestore(), 'users/owner1'), {
    email: 'owner@example.com',
    displayName: 'Owner',
  }),
);
await assertFails(
  setDoc(doc(owner.firestore(), 'users/member1'), {
    email: 'member@example.com',
  }),
);
await assertFails(getDoc(doc(stranger.firestore(), 'users/owner1')));

await assertSucceeds(
  updateDoc(doc(owner.firestore(), 'organizations/org1'), {
    name: 'Fleet Updated',
  }),
);
await assertFails(
  updateDoc(doc(owner.firestore(), 'organizations/org1'), {
    ownerId: 'member1',
  }),
);
await assertFails(
  updateDoc(doc(member.firestore(), 'organizations/org1'), {
    name: 'Hack',
  }),
);

await assertSucceeds(
  updateDoc(doc(member.firestore(), 'organizations/org1/members/member1'), {
    displayName: 'Member Renamed',
  }),
);

await env.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();
  await setDoc(doc(db, 'organizations/org1/members/inactive1'), {
    role: 'member',
    status: 'inactive',
    email: 'inactive@example.com',
    displayName: 'Inactive',
    assignedCardIds: ['card1'],
  });
  await setDoc(doc(db, 'organizations/org1/invites/inv1'), {
    email: 'invitee@example.com',
    invitedBy: 'owner1',
    status: 'pending',
    orgName: 'Fleet Updated',
  });
});

const inactive = env.authenticatedContext('inactive1', { email: 'inactive@example.com' });
await assertFails(getDoc(doc(inactive.firestore(), 'organizations/org1')));
await assertFails(getDoc(doc(inactive.firestore(), 'organizations/org1/cards/card1')));

const invitee = env.authenticatedContext('invitee1', { email: 'invitee@example.com' });
await assertSucceeds(getDoc(doc(invitee.firestore(), 'organizations/org1/invites/inv1')));
await assertFails(getDoc(doc(stranger.firestore(), 'organizations/org1/invites/inv1')));
await assertSucceeds(
  updateDoc(doc(invitee.firestore(), 'organizations/org1/invites/inv1'), {
    status: 'accepted',
    email: 'invitee@example.com',
  }),
);

await assertSucceeds(
  setDoc(doc(owner.firestore(), 'organizations/org1/invites/inv2'), {
    email: 'another@example.com',
    invitedBy: 'owner1',
    status: 'pending',
    orgName: 'Fleet Updated',
  }),
);
await assertSucceeds(deleteDoc(doc(owner.firestore(), 'organizations/org1/invites/inv2')));
await assertFails(deleteDoc(doc(member.firestore(), 'organizations/org1/invites/inv1')));

await assertFails(
  setDoc(doc(member.firestore(), 'organizations/org1/transactions/t4'), {
    type: 'FUEL',
    cardId: 'card1',
    userId: 'owner1',
    createdBy: 'member1',
    amount: 100,
    station: 'PSO',
    area: 'Gulberg',
    syncStatus: 'PENDING',
    requiresReview: false,
  }),
);

await assertFails(
  setDoc(doc(member.firestore(), 'organizations/org1/transactions/t5'), {
    type: 'FUEL',
    cardId: 'card1',
    userId: 'member1',
    createdBy: 'member1',
    amount: 0,
    station: 'PSO',
    area: 'Gulberg',
    syncStatus: 'PENDING',
    requiresReview: false,
  }),
);

await assertFails(
  updateDoc(doc(owner.firestore(), 'organizations/org1/transactions/t1'), {
    amount: 50,
  }),
);

await assertFails(
  updateDoc(doc(owner.firestore(), 'organizations/org1/recharges/r1'), {
    amount: 1,
  }),
);

await assertFails(
  setDoc(doc(owner.firestore(), 'organizations/org1/adjustments/a0'), {
    cardId: 'card1',
    amount: 0,
    reason: 'Zero',
    kind: 'CORRECTION',
    createdBy: 'owner1',
    occurredAt: '2026-10-05T00:00:00.000Z',
  }),
);

await assertSucceeds(
  setDoc(doc(owner.firestore(), 'organizations/org1/settlements/s5'), {
    userId: 'member1',
    amount: 200,
    method: 'cash',
    status: 'pending',
    createdBy: 'owner1',
    occurredAt: '2026-10-05T22:00:00.000Z',
  }),
);

await assertFails(
  updateDoc(doc(member.firestore(), 'organizations/org1/settlements/s5'), {
    status: 'confirmed',
    confirmedBy: 'member1',
    amount: 200,
    method: 'cash',
  }),
);

await assertFails(
  setDoc(doc(member.firestore(), 'organizations/org1/cards/card1/secrets/pin'), {
    value: '9999',
    updatedAt: Timestamp.now(),
  }),
);

await assertFails(
  setDoc(doc(owner.firestore(), 'organizations/org1/cards/card1/secrets/pin'), {
    value: '12',
    updatedAt: Timestamp.now(),
  }),
);

await env.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();
  await setDoc(doc(db, 'organizations/org1/pinRequests/card1_member1'), {
    cardId: 'card1',
    requestedBy: 'member1',
    status: 'pending',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
});

await assertSucceeds(
  updateDoc(doc(owner.firestore(), 'organizations/org1/pinRequests/card1_member1'), {
    status: 'rejected',
    resolvedBy: 'owner1',
    resolvedAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  }),
);

await assertFails(getDoc(doc(member.firestore(), 'organizations/org1/cards/card1/secrets/pin')));

await assertFails(
  updateDoc(doc(owner.firestore(), 'organizations/org1/cards/card1'), {
    status: 'inactive',
    pin: '9999',
  }),
);

await assertSucceeds(
  updateDoc(doc(owner.firestore(), 'organizations/org1/cards/card1'), {
    status: 'inactive',
    name: 'Meezan',
    last4: '1234',
    issuer: 'Meezan',
  }),
);

await env.withSecurityRulesDisabled(async (context) => {
  const db = context.firestore();
  await setDoc(doc(db, 'organizations/org1/invites/inv3'), {
    email: 'lookup@example.com',
    invitedBy: 'owner1',
    status: 'pending',
    orgName: 'Fleet Updated',
  });
});

const lookup = env.authenticatedContext('lookup1', { email: 'lookup@example.com' });
await assertSucceeds(getDoc(doc(lookup.firestore(), 'organizations/org1/invites/inv3')));
await assertFails(getDoc(doc(stranger.firestore(), 'organizations/org1/invites/inv3')));

await env.cleanup();
console.log('firestore rules tests ok');
