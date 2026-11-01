import { PermissionCode, Permissions } from '@hospital-crm/shared';

export interface UserContext {
  id: number;
  name: string;
  email: string;
  roleId: number;
  roleCode: string;
  branchIds: number[];
  teamCodes: string[];
  maskPhone: boolean;
  permissions: Record<string, string>; // permissionCode -> scope ('own' | 'team' | 'branch' | 'all')
  grants: Array<{
    permission: string;
    scope: string;
    startsAt: Date;
    endsAt: Date;
  }>;
}

export type ResourceType = 'lead' | 'case' | 'task' | 'interaction' | 'appointment' | 'escalation' | 'audit' | 'report';

const SCOPE_HIERARCHY: Record<string, number> = {
  none: 0,
  own: 1,
  team: 2,
  branch: 3,
  all: 4,
};

/**
 * Returns the effective scope for a given permission code, taking into account
 * role permissions and active temporary permission grants.
 */
export function getEffectiveScope(user: UserContext, permission: string): string {
  let baseScope = user.permissions[permission] || 'none';
  let bestLevel = SCOPE_HIERARCHY[baseScope] || 0;

  const now = new Date();
  if (user.grants && user.grants.length > 0) {
    for (const grant of user.grants) {
      if (
        grant.permission === permission &&
        new Date(grant.startsAt) <= now &&
        now <= new Date(grant.endsAt)
      ) {
        const grantLevel = SCOPE_HIERARCHY[grant.scope] || 0;
        if (grantLevel > bestLevel) {
          bestLevel = grantLevel;
          baseScope = grant.scope;
        }
      }
    }
  }

  return baseScope;
}

/**
 * Generates the Prisma `where` clause for the given user, resource, and permission.
 * Never trusts client input for scoping.
 *
 * @param user Authenticated user context
 * @param resource CRM entity type
 * @param requestedPermission Specific permission code (defaults to resource view)
 * @returns Prisma where object
 */
export function scopeWhere(
  user: UserContext,
  resource: ResourceType,
  requestedPermission?: string
): Record<string, any> {
  let permission = requestedPermission;

  if (!permission) {
    switch (resource) {
      case 'lead':
        permission = Permissions.LEAD_VIEW;
        break;
      case 'case':
        permission = Permissions.CASE_VIEW;
        break;
      case 'task':
        permission = Permissions.TASK_VIEW;
        break;
      case 'interaction':
        permission = Permissions.INTERACTION_CREATE;
        break;
      case 'report':
        permission = Permissions.REPORT_VIEW;
        break;
      case 'audit':
        permission = Permissions.AUDIT_VIEW;
        break;
      default:
        permission = `${resource}.view`;
    }
  }

  const scope = getEffectiveScope(user, permission);

  // If no permission or scope is none, match nothing
  if (!scope || scope === 'none') {
    return { id: -1 };
  }

  // Handle 'all' scope
  if (scope === 'all') {
    return resource === 'audit' ? {} : { archivedAt: null };
  }

  // Handle 'branch' scope
  if (scope === 'branch') {
    const branches = user.branchIds.length > 0 ? user.branchIds : [-1];
    if (resource === 'task') {
      return {
        OR: [
          { lead: { branchId: { in: branches } } },
          { case: { branchId: { in: branches } } },
          { owner: { userBranches: { some: { branchId: { in: branches } } } } },
        ],
        archivedAt: null,
      };
    }
    if (resource === 'interaction') {
      return {
        OR: [
          { lead: { branchId: { in: branches } } },
          { case: { branchId: { in: branches } } },
          { user: { userBranches: { some: { branchId: { in: branches } } } } },
        ],
        archivedAt: null,
      };
    }
    if (resource === 'audit') {
      return {};
    }
    return {
      branchId: { in: branches },
      archivedAt: null,
    };
  }

  // Handle 'team' scope
  if (scope === 'team') {
    const teams = user.teamCodes.length > 0 ? user.teamCodes : ['__none__'];
    const branches = user.branchIds.length > 0 ? user.branchIds : [-1];

    if (resource === 'lead') {
      return {
        branchId: { in: branches },
        owner: {
          userTeams: {
            some: {
              team: { code: { in: teams } },
            },
          },
        },
        archivedAt: null,
      };
    }

    if (resource === 'case') {
      return {
        branchId: { in: branches },
        team: { in: teams },
        archivedAt: null,
      };
    }

    if (resource === 'task') {
      return {
        owner: {
          userTeams: {
            some: {
              team: { code: { in: teams } },
            },
          },
        },
        archivedAt: null,
      };
    }

    if (resource === 'interaction') {
      return {
        user: {
          userTeams: {
            some: {
              team: { code: { in: teams } },
            },
          },
        },
        archivedAt: null,
      };
    }

    return { id: -1 };
  }

  // Handle 'own' scope
  if (scope === 'own') {
    if (resource === 'lead') {
      return {
        ownerId: user.id,
        archivedAt: null,
      };
    }

    if (resource === 'case') {
      // Treating doctors see cases where they are the treating doctor or owner
      if (user.roleCode === 'doctor') {
        return {
          OR: [{ ownerId: user.id }, { treatingDoctorId: user.id }],
          archivedAt: null,
        };
      }
      return {
        ownerId: user.id,
        archivedAt: null,
      };
    }

    if (resource === 'task') {
      return {
        ownerId: user.id,
        archivedAt: null,
      };
    }

    if (resource === 'interaction') {
      return {
        userId: user.id,
        archivedAt: null,
      };
    }

    if (resource === 'escalation') {
      return {
        OR: [{ raisedBy: user.id }, { assignedDoctorId: user.id }],
      };
    }

    return { id: -1 };
  }

  return { id: -1 };
}
