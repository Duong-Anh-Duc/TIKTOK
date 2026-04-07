export type UserRole = 'ADMIN' | 'STAFF' | 'VIEWER';

export interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity: string;
  entity_id: string;
  old_value?: Record<string, unknown>;
  new_value?: Record<string, unknown>;
  created_at: string;
  user?: User;
}
