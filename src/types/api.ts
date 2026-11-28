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

// Categories (Phase 9)
export type Category = Schemas['CategoryResponse'];
export type CreateCategoryRequest = Schemas['CreateCategoryRequest'];
export type UpdateCategoryRequest = Schemas['UpdateCategoryRequest'];

// Projects and users (Phase 10)
export type ProjectSummary = Schemas['ProjectSummaryResponse'];
export type ProjectDetails = Schemas['ProjectDetailsResponse'];
export type ProjectMember = Schemas['ProjectMemberResponse'];
export type PagedProjects = Schemas['PagedResultOfProjectSummaryResponse'];
export type ProjectSortField = Schemas['ProjectSortField'];
export type ProjectQuery = NonNullable<operations['Projects_GetProjects']['parameters']['query']>;
export type CreateProjectRequest = Schemas['CreateProjectRequest'];
export type UpdateProjectRequest = Schemas['UpdateProjectRequest'];
export type UserLookup = Schemas['UserLookupResponse'];

// Task writes (Phase 11)
export type CreateTaskRequest = Schemas['CreateTaskRequest'];
export type UpdateTaskRequest = Schemas['UpdateTaskRequest'];

// Comments (Phase 12)
export type Comment = Schemas['CommentResponse'];
export type PagedComments = Schemas['PagedResultOfCommentResponse'];

// Users (Phase 13)
export type PagedUsers = Schemas['PagedResultOfUserProfileResponse'];
export type UserQuery = NonNullable<operations['Users_GetUsers']['parameters']['query']>;
export type UserSortField = Schemas['UserSortField'];
export type UpdateProfileRequest = Schemas['UpdateProfileRequest'];
