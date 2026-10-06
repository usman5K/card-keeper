import { orgCapabilities } from '@/features/org/capabilities';

describe('orgCapabilities', () => {
  it('exposes owner admin surfaces', () => {
    const caps = orgCapabilities('owner');
    expect(caps.isOwner).toBe(true);
    expect(caps.canInviteMembers).toBe(true);
    expect(caps.canAccessAudit).toBe(true);
    expect(caps.peopleTabTitle).toBe('People');
    expect(caps.reportGroupKinds).toContain('person');
    expect(caps.defaultReportGroup).toBe('person');
  });

  it('scopes member surfaces for invited workspaces', () => {
    const caps = orgCapabilities('member');
    expect(caps.isMember).toBe(true);
    expect(caps.canInviteMembers).toBe(false);
    expect(caps.canManageCards).toBe(false);
    expect(caps.canAccessAudit).toBe(false);
    expect(caps.canRecordFuelForOthers).toBe(false);
    expect(caps.peopleTabTitle).toBe('Balances');
    expect(caps.reportsTitle).toBe('Your spend');
    expect(caps.reportGroupKinds).not.toContain('person');
    expect(caps.defaultReportGroup).toBe('card');
  });

  it('stays neutral while role is unknown', () => {
    const caps = orgCapabilities(null);
    expect(caps.isOwner).toBe(false);
    expect(caps.isMember).toBe(false);
    expect(caps.canInviteMembers).toBe(false);
    expect(caps.peopleTabTitle).toBe('People');
    expect(caps.reportsTitle).toBe('Reports');
    expect(caps.reportGroupKinds).toEqual(['card', 'time']);
  });
});
