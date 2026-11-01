import { describe, it, expect } from 'vitest';
import { scopeWhere, getEffectiveScope, UserContext } from './scope';
import { Permissions, Scopes } from '@hospital-crm/shared';

describe('RBAC scopeWhere & getEffectiveScope', () => {
  const baseTelecaller: UserContext = {
    id: 10,
    name: 'Rahul Telecaller',
    email: 'rahul@hospital.test',
    roleId: 5,
    roleCode: 'support_telecaller',
    branchIds: [1],
    teamCodes: ['support'],
    maskPhone: false,
    permissions: {
      [Permissions.LEAD_VIEW]: Scopes.OWN,
      [Permissions.CASE_VIEW]: Scopes.OWN,
      [Permissions.TASK_VIEW]: Scopes.OWN,
    },
    grants: [],
  };

  const baseAdmin: UserContext = {
    id: 2,
    name: 'System Admin',
    email: 'admin@hospital.test',
    roleId: 2,
    roleCode: 'admin',
    branchIds: [1],
    teamCodes: ['support', 'admission', 'aftercare'],
    maskPhone: false,
    permissions: {
      [Permissions.USER_MANAGE]: Scopes.ALL,
      [Permissions.SETTINGS_MANAGE]: Scopes.ALL,
    },
    grants: [],
  };

  const baseOwner: UserContext = {
    id: 1,
    name: 'Director Owner',
    email: 'owner@hospital.test',
    roleId: 1,
    roleCode: 'owner',
    branchIds: [1],
    teamCodes: ['support', 'admission', 'aftercare'],
    maskPhone: false,
    permissions: {
      [Permissions.LEAD_VIEW]: Scopes.ALL,
      [Permissions.CASE_VIEW]: Scopes.ALL,
    },
    grants: [],
  };

  it('owner has all scope and queries unarchived records without restriction', () => {
    const where = scopeWhere(baseOwner, 'lead');
    expect(where).toEqual({ archivedAt: null });
  });

  it('support telecaller has own scope and queries strictly by ownerId', () => {
    const where = scopeWhere(baseTelecaller, 'lead');
    expect(where).toEqual({
      ownerId: 10,
      archivedAt: null,
    });
  });

  it('admin has no lead permissions by default and queries match nothing (id: -1)', () => {
    expect(getEffectiveScope(baseAdmin, Permissions.LEAD_VIEW)).toBe('none');
    const where = scopeWhere(baseAdmin, 'lead');
    expect(where).toEqual({ id: -1 });
  });

  it('active permission grant elevates admin scope to branch level', () => {
    const adminWithActiveGrant: UserContext = {
      ...baseAdmin,
      grants: [
        {
          permission: Permissions.LEAD_VIEW,
          scope: Scopes.BRANCH,
          startsAt: new Date(Date.now() - 3600 * 1000), // 1 hour ago
          endsAt: new Date(Date.now() + 3600 * 1000), // 1 hour in future
        },
      ],
    };

    expect(getEffectiveScope(adminWithActiveGrant, Permissions.LEAD_VIEW)).toBe(Scopes.BRANCH);
    const where = scopeWhere(adminWithActiveGrant, 'lead');
    expect(where).toEqual({
      branchId: { in: [1] },
      archivedAt: null,
    });
  });

  it('expired permission grant does not elevate scope', () => {
    const adminWithExpiredGrant: UserContext = {
      ...baseAdmin,
      grants: [
        {
          permission: Permissions.LEAD_VIEW,
          scope: Scopes.BRANCH,
          startsAt: new Date(Date.now() - 7200 * 1000), // 2 hours ago
          endsAt: new Date(Date.now() - 3600 * 1000), // Expired 1 hour ago
        },
      ],
    };

    expect(getEffectiveScope(adminWithExpiredGrant, Permissions.LEAD_VIEW)).toBe('none');
    const where = scopeWhere(adminWithExpiredGrant, 'lead');
    expect(where).toEqual({ id: -1 });
  });

  it('team scope filters by branch and team ownership', () => {
    const manager: UserContext = {
      id: 4,
      name: 'Manager',
      email: 'manager@hospital.test',
      roleId: 4,
      roleCode: 'telecaller_manager',
      branchIds: [1],
      teamCodes: ['support'],
      maskPhone: false,
      permissions: {
        [Permissions.LEAD_VIEW]: Scopes.TEAM,
      },
      grants: [],
    };

    const where = scopeWhere(manager, 'lead');
    expect(where).toEqual({
      branchId: { in: [1] },
      owner: {
        userTeams: {
          some: {
            team: { code: { in: ['support'] } },
          },
        },
      },
      archivedAt: null,
    });
  });
});
