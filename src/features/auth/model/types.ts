export interface AuthUser {
  id: number;
  tenant_id: string;
  username: string;
  role: 'admin' | 'operator';
}
