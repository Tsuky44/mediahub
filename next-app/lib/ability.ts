import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { User } from 'next-auth';
import { logger } from '@/lib/logger';

export type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete' | 'trigger_search' | 'manage_settings' | 'interactive_search' | 'sync' | 'read_all' | 'import' | 'manage_storage' | 'delete_media' | 'add_torrent' | 'manage_torrents' | 'read_explorer' | 'share_files' | 'delete_files' | 'read_all_media_available' | 'read_own_media_available' | 'read_system_update' | 'read_new_ticket';
export type Subjects = 
  | 'all' 
  | 'User' 
  | 'MediaRequest' 
  | 'Settings' 
  | 'Downloads'
  | 'Stats'
  | 'Media'
  | 'DashboardStats'
  | 'Library'
  | 'Notification'; 

export type AppAbility = MongoAbility<[Actions, Subjects]>;

interface PermissionDef {
  action: Actions
  subject: Subjects
  conditions?: string
}

interface AbilityUser {
  role: string
  permissions?: Array<{ action: string; subject: string; conditions?: string | null }>
  [key: string]: unknown
}

export function defineAbilityFor(user?: AbilityUser) {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);

  if (!user) {
    // Guest permissions - Restricted
    // can('read', 'all'); // REMOVED: Guests should not have full access by default
  } else {
    if (user.role === 'admin') {
      can('manage', 'all');
    } else {
      // Default basic permissions for ALL authenticated users
      // They can see media and make requests, but NOTHING ELSE by default.
      // can('read', 'Media'); // Let's be strict: if it's not in the role, they can't see it.
      // can('read', 'MediaRequest');
      // can('create', 'MediaRequest');
      
      if (user.permissions) {
        user.permissions.forEach((p) => {
          try {
            const conditions = p.conditions ? JSON.parse(p.conditions) : undefined;
            can(p.action as Actions, p.subject as Subjects, conditions);
          } catch (e) {
            logger.error('Failed to parse permission conditions', e);
            can(p.action as Actions, p.subject as Subjects);
          }
        });
      }
    }
  }

  return build();
}
