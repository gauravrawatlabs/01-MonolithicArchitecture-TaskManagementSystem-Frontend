/**
 * Friendly names for the backend DTOs. The source of truth is src/api/generated/schema.ts,
 * generated from the backend's OpenAPI document (npm run api:types). Never re-declare DTO
 * fields by hand: alias them here so a backend change breaks the build instead of the app.
 * More aliases are added as features need them.
 */
import { type components } from '@/api/generated/schema';

type Schemas = components['schemas'];

export type TaskItemStatus = Schemas['TaskItemStatus'];
export type TaskPriority = Schemas['TaskPriority'];
export type SortDirection = NonNullable<Schemas['SortDirection']>;
export type UserProfile = Schemas['UserProfileResponse'];
