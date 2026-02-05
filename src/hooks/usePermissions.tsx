 import { useMemo } from 'react';
 import { useTenant, MembershipRole } from '@/contexts/TenantContext';
 
 type Resource = 
   | 'memberships'
   | 'mentees'
   | 'mentors'
   | 'trails'
   | 'lessons'
   | 'badges'
   | 'calendar'
   | 'crm'
   | 'emails'
   | 'reports'
   | 'settings'
   | 'impersonation_logs';
 
 type Action = 'view' | 'create' | 'edit' | 'delete' | 'manage';
 
 // Permission matrix: role -> resource -> actions
 const permissionMatrix: Record<MembershipRole, Record<Resource, Action[]>> = {
   master_admin: {
     memberships: ['view', 'create', 'edit', 'delete', 'manage'],
     mentees: ['view', 'create', 'edit', 'delete', 'manage'],
     mentors: ['view', 'create', 'edit', 'delete', 'manage'],
     trails: ['view', 'create', 'edit', 'delete', 'manage'],
     lessons: ['view', 'create', 'edit', 'delete', 'manage'],
     badges: ['view', 'create', 'edit', 'delete', 'manage'],
     calendar: ['view', 'create', 'edit', 'delete', 'manage'],
     crm: ['view', 'create', 'edit', 'delete', 'manage'],
     emails: ['view', 'create', 'edit', 'delete', 'manage'],
     reports: ['view', 'manage'],
     settings: ['view', 'edit', 'manage'],
     impersonation_logs: ['view'],
   },
   admin: {
     memberships: ['view', 'create', 'edit', 'delete', 'manage'],
     mentees: ['view', 'create', 'edit', 'delete', 'manage'],
     mentors: ['view', 'create', 'edit', 'delete', 'manage'],
     trails: ['view', 'create', 'edit', 'delete', 'manage'],
     lessons: ['view', 'create', 'edit', 'delete', 'manage'],
     badges: ['view', 'create', 'edit', 'delete', 'manage'],
     calendar: ['view', 'create', 'edit', 'delete', 'manage'],
     crm: ['view', 'create', 'edit', 'delete', 'manage'],
     emails: ['view', 'create', 'edit', 'delete', 'manage'],
     reports: ['view', 'manage'],
     settings: ['view', 'edit', 'manage'],
     impersonation_logs: ['view'],
   },
   ops: {
     memberships: ['view', 'edit'],
     mentees: ['view', 'edit'],
     mentors: ['view'],
     trails: ['view', 'create', 'edit'],
     lessons: ['view', 'create', 'edit'],
     badges: ['view', 'create', 'edit'],
     calendar: ['view', 'create', 'edit'],
     crm: ['view', 'create', 'edit'],
     emails: ['view', 'create', 'edit'],
     reports: ['view'],
     settings: ['view'],
     impersonation_logs: [],
   },
   mentor: {
     memberships: [],
     mentees: ['view', 'edit'], // Only assigned mentees
     mentors: [],
     trails: ['view', 'create', 'edit'],
     lessons: ['view', 'create', 'edit'],
     badges: ['view', 'create', 'edit'],
     calendar: ['view', 'create', 'edit', 'delete'],
     crm: ['view', 'create', 'edit', 'delete'],
     emails: ['view', 'create', 'edit'],
     reports: ['view'],
     settings: [],
     impersonation_logs: [],
   },
   mentee: {
     memberships: [],
     mentees: [], // Can only see own via profile
     mentors: [],
     trails: ['view'],
     lessons: ['view'],
     badges: ['view'],
     calendar: ['view'],
     crm: ['view', 'create', 'edit', 'delete'], // Own CRM
     emails: [],
     reports: [],
     settings: [],
     impersonation_logs: [],
   },
 };
 
 export interface PermissionHelpers {
   // Check specific permission
   can: (action: Action, resource: Resource) => boolean;
   
   // Shorthand helpers
   canView: (resource: Resource) => boolean;
   canCreate: (resource: Resource) => boolean;
   canEdit: (resource: Resource) => boolean;
   canDelete: (resource: Resource) => boolean;
   canManage: (resource: Resource) => boolean;
   
   // Role checks
   isStaff: boolean;  // admin, ops, or mentor
   isAdminOrOps: boolean;
   
   // Access panel checks
   canAccessAdminPanel: boolean;
   canAccessMemberPanel: boolean;
 }
 
 export function usePermissions(): PermissionHelpers {
   const { activeMembership, realMembership } = useTenant();
 
   return useMemo(() => {
     const role = activeMembership?.role;
     
     const can = (action: Action, resource: Resource): boolean => {
       if (!role) return false;
       const permissions = permissionMatrix[role][resource] || [];
       return permissions.includes(action);
     };
 
     const canView = (resource: Resource) => can('view', resource);
     const canCreate = (resource: Resource) => can('create', resource);
     const canEdit = (resource: Resource) => can('edit', resource);
     const canDelete = (resource: Resource) => can('delete', resource);
     const canManage = (resource: Resource) => can('manage', resource);
 
       const isStaff = role === 'master_admin' || role === 'admin' || role === 'ops' || role === 'mentor';
       const isAdminOrOps = role === 'master_admin' || role === 'admin' || role === 'ops';
 
     // Real membership determines panel access (not impersonated role)
     const realRole = realMembership?.role;
       const canAccessAdminPanel = realRole === 'master_admin' || realRole === 'admin' || realRole === 'ops' || realRole === 'mentor';
       const canAccessMasterPanel = realRole === 'master_admin';
     const canAccessMemberPanel = true; // Everyone can access member panel
 
     return {
       can,
       canView,
       canCreate,
       canEdit,
       canDelete,
       canManage,
       isStaff,
       isAdminOrOps,
       canAccessAdminPanel,
       canAccessMemberPanel,
     };
   }, [activeMembership, realMembership]);
 }