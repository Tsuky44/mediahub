import { AbilityBuilder, createMongoAbility, MongoAbility } from '@casl/ability';
import { User } from 'next-auth';

export type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete' | 'trigger_search' | 'manage_settings' | 'interactive_search' | 'sync' | 'read_all' | 'import' | 'manage_storage' | 'delete_media' | 'add_torrent' | 'manage_torrents' | 'read_explorer' | 'share_files' | 'delete_files' | 'read_details' | 'manage_containers' | 'manage_groups' | 'read_logs' | 'read_stats' | 'manage_state' | 'access_console';
export type Subjects = 
  | 'all' 
  | 'User' 
  | 'MediaRequest' 
  | 'Settings' 
  | 'Downloads'
  | 'Docker'
  | 'Stats'
  | 'Media'
  | 'DashboardStats'
  | 'Library'; 

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export function defineAbilityFor(user?: any) {
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
        user.permissions.forEach((p: any) => {
          try {
            const conditions = p.conditions ? JSON.parse(p.conditions) : undefined;
            can(p.action, p.subject, conditions);
          } catch (e) {
            console.error('Failed to parse permission conditions', e);
            can(p.action, p.subject);
          }
        });
      }
    }
  }

  return build();
}
