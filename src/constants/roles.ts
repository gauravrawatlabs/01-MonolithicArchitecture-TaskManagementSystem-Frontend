/** Global roles, exactly as the backend names them (Constants/Roles.cs). */
export const ROLES = ['Admin', 'Manager', 'User'] as const;

export type Role = (typeof ROLES)[number];
