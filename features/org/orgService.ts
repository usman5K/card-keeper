import type { User } from 'firebase/auth';
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

import { writeAuditLog } from '@/features/audit/auditService';
import { getFirestoreDb } from '@/firebase/firestore';
import type { OrgInvite, OrgMember, Organization, UserProfile } from '@/types/org';
import { normalizeEmail } from '@/utils/email';

function dbOrThrow() {
  const db = getFirestoreDb();
  if (!db) {
    throw new Error('Firestore is not configured');
  }
  return db;
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const db = dbOrThrow();
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const email = normalizeEmail(user.email ?? '');

  if (snap.exists()) {
    const data = snap.data() as UserProfile;
    if (data.email !== email || data.displayName !== (user.displayName ?? null)) {
      await updateDoc(ref, {
        email,
        displayName: user.displayName ?? null,
        photoURL: user.photoURL ?? null,
        updatedAt: serverTimestamp(),
      });
    }
    return {
      ...data,
      email,
      displayName: user.displayName ?? data.displayName ?? null,
      photoURL: user.photoURL ?? data.photoURL ?? null,
    };
  }

  const profile: UserProfile = {
    email,
    displayName: user.displayName ?? null,
    photoURL: user.photoURL ?? null,
    activeOrgId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return profile;
}

export async function createOrganization(user: User, name: string) {
  const db = dbOrThrow();
  const trimmed = name.trim();
  if (!trimmed) {
    throw new Error('Organization name is required');
  }

  const orgRef = doc(collection(db, 'organizations'));
  const memberRef = doc(db, 'organizations', orgRef.id, 'members', user.uid);
  const userRef = doc(db, 'users', user.uid);
  const email = normalizeEmail(user.email ?? '');

  const org: Organization = {
    name: trimmed,
    ownerId: user.uid,
    currency: 'PKR',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const member: OrgMember = {
    role: 'owner',
    status: 'active',
    email,
    displayName: user.displayName ?? null,
    assignedCardIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.set(orgRef, org);
  batch.set(memberRef, member);
  batch.set(
    userRef,
    {
      email,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      activeOrgId: orgRef.id,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();

  await writeAuditLog(orgRef.id, {
    actorId: user.uid,
    action: 'ORG_CREATE',
    entityType: 'organization',
    entityId: orgRef.id,
    metadata: { name: trimmed },
  });

  return orgRef.id;
}

export async function findPendingInvitesForEmail(email: string) {
  const db = dbOrThrow();
  const normalized = normalizeEmail(email);
  try {
    const inviteQuery = query(
      collectionGroup(db, 'invites'),
      where('email', '==', normalized),
      where('status', '==', 'pending'),
    );
    const inviteSnap = await getDocs(inviteQuery);
    const matches: { orgId: string; orgName: string; inviteId: string; invite: OrgInvite }[] = [];

    for (const inviteDoc of inviteSnap.docs) {
      const orgRef = inviteDoc.ref.parent.parent;
      if (!orgRef) {
        continue;
      }
      const invite = inviteDoc.data() as OrgInvite;
      matches.push({
        orgId: orgRef.id,
        orgName: invite.orgName || 'Workspace',
        inviteId: inviteDoc.id,
        invite,
      });
    }

    return matches;
  } catch {
    return [];
  }
}

export async function acceptInvite(user: User, orgId: string, inviteId: string) {
  const db = dbOrThrow();
  const email = normalizeEmail(user.email ?? '');
  const inviteRef = doc(db, 'organizations', orgId, 'invites', inviteId);
  const inviteSnap = await getDoc(inviteRef);
  if (!inviteSnap.exists()) {
    throw new Error('Invite not found');
  }

  const invite = inviteSnap.data() as OrgInvite;
  if (invite.status !== 'pending' || normalizeEmail(invite.email) !== email) {
    throw new Error('Invite is not valid for this account');
  }

  const memberRef = doc(db, 'organizations', orgId, 'members', user.uid);
  const userRef = doc(db, 'users', user.uid);

  const member: OrgMember = {
    role: 'member',
    status: 'active',
    email,
    displayName: user.displayName ?? null,
    assignedCardIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const batch = writeBatch(db);
  batch.set(memberRef, member);
  batch.update(inviteRef, {
    status: 'accepted',
    updatedAt: serverTimestamp(),
  });
  batch.set(
    userRef,
    {
      email,
      displayName: user.displayName ?? null,
      photoURL: user.photoURL ?? null,
      activeOrgId: orgId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
  await batch.commit();

  await writeAuditLog(orgId, {
    actorId: user.uid,
    action: 'MEMBER_ACTIVATE',
    entityType: 'member',
    entityId: user.uid,
    metadata: { inviteId, email },
  });
}

export async function inviteMemberByEmail(orgId: string, invitedBy: string, email: string) {
  const db = dbOrThrow();
  const normalized = normalizeEmail(email);
  if (!normalized.includes('@')) {
    throw new Error('Enter a valid email');
  }

  const org = await getOrganization(orgId);
  if (!org) {
    throw new Error('Workspace not found');
  }

  const inviteRef = doc(collection(db, 'organizations', orgId, 'invites'));
  const invite: OrgInvite = {
    email: normalized,
    invitedBy,
    status: 'pending',
    orgName: org.name,
    createdAt: serverTimestamp(),
  };
  await setDoc(inviteRef, invite);
  await writeAuditLog(orgId, {
    actorId: invitedBy,
    action: 'MEMBER_INVITE',
    entityType: 'invite',
    entityId: inviteRef.id,
    metadata: { email: normalized },
  });
  return inviteRef.id;
}

export async function getActiveMembership(userId: string, orgId: string) {
  const db = dbOrThrow();
  const snap = await getDoc(doc(db, 'organizations', orgId, 'members', userId));
  if (!snap.exists()) {
    return null;
  }
  const member = snap.data() as OrgMember;
  if (member.status !== 'active') {
    return null;
  }
  return member;
}

export async function getOrganization(orgId: string) {
  const db = dbOrThrow();
  const snap = await getDoc(doc(db, 'organizations', orgId));
  if (!snap.exists()) {
    return null;
  }
  return { id: snap.id, ...(snap.data() as Organization) };
}

export type OrgMemberDoc = OrgMember & { id: string };

export async function listActiveMembers(orgId: string): Promise<OrgMemberDoc[]> {
  const db = dbOrThrow();
  const snap = await getDocs(collection(db, 'organizations', orgId, 'members'));
  return snap.docs
    .map((item) => ({ id: item.id, ...(item.data() as OrgMember) }))
    .filter((member) => member.status === 'active')
    .sort((a, b) => {
      if (a.role !== b.role) {
        return a.role === 'owner' ? -1 : 1;
      }
      return (a.displayName || a.email).localeCompare(b.displayName || b.email);
    });
}

export async function setMemberAssignedCards(
  orgId: string,
  memberId: string,
  assignedCardIds: string[],
) {
  const db = dbOrThrow();
  const unique = [...new Set(assignedCardIds.filter(Boolean))];
  await updateDoc(doc(db, 'organizations', orgId, 'members', memberId), {
    assignedCardIds: unique,
    updatedAt: serverTimestamp(),
  });
}
