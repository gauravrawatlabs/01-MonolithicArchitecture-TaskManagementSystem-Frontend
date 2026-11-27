/**
 * Friendly names for the backend DTOs. The source of truth is src/api/generated/schema.ts,
 * generated from the backend's OpenAPI document (npm run api:types). Never re-declare DTO
 * fields by hand: alias them here so a backend change breaks the build instead of the app.
 * More aliases are added as features need them.
 */
import { type components, type operations } from '@/api/generated/schema';

type Schemas = components['schemas'];

export type TaskItemStatus = Schemas['TaskItemStatus'];
export type TaskPriority = Schemas['TaskPriority'];
export type SortDirection = NonNullable<Schemas['SortDirection']>;
export type UserProfile = Schemas['UserProfileResponse'];

// Authentication and account (Phase 6)
export type AuthResponse = Schemas['AuthResponse'];
export type LoginRequest = Schemas['LoginRequest'];
export type RegisterRequest = Schemas['RegisterRequest'];
export type RefreshTokenRequest = Schemas['RefreshTokenRequest'];
export type ConfirmEmailRequest = Schemas['ConfirmEmailRequest'];
export type ResendConfirmationEmailRequest = Schemas['ResendConfirmationEmailRequest'];
export type ForgotPasswordRequest = Schemas['ForgotPasswordRequest'];
export type ResetPasswordRequest = Schemas['ResetPasswordRequest'];
export type ChangePasswordRequest = Schemas['ChangePasswordRequest'];

// Tasks (Phase 8+)
export type Task = Schemas['TaskResponse'];
export type TaskSortField = Schemas['TaskSortField'];
export type PagedTasks = Schemas['PagedResultOfTaskResponse'];
/**
 * GET /api/tasks query parameters, exactly as the backend binds them (PascalCase in the OpenAPI
 * document; ASP.NET Core binds query strings case-insensitively).
 */
export type TaskQuery = NonNullable<operations['Tasks_GetTasks']['parameters']['query']>;

// Dashboard (Phase 8)
export type DashboardResponse = Schemas['DashboardResponse'];
export type ProjectProgress = Schemas['ProjectProgressResponse'];
