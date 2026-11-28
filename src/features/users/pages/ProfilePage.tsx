import { zodResolver } from '@hookform/resolvers/zod';
import { BadgeCheck, MailWarning } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';

import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/common/Button';
import { Card, CardContent, CardHeader } from '@/components/common/Card';
import { Input } from '@/components/common/Input';
import { FormErrorSummary } from '@/components/forms/FormErrorSummary';
import { FormField } from '@/components/forms/FormField';
import { PageHeader } from '@/components/layout/PageHeader';
import { paths } from '@/constants/routes';
import { useToast } from '@/contexts/toast';
import { isEmailVerified, useAuth } from '@/features/auth';
import { type UserProfile } from '@/types/api';
import { formatDate, formatTimeAgo } from '@/utils/dates';
import { applyServerErrors } from '@/utils/formErrors';

import { RoleBadges } from '../components/RoleBadges';
import { useUpdateMyProfile } from '../hooks/useUsers';
import { profileSchema, type ProfileValues, toProfileRequest } from '../schemas/profileSchema';
import { fullName, JOB_TITLE_MAX, NAME_MAX } from '../userRules';

/** /profile: who you are in the system, and the parts you can change yourself (name, job title). */
export function ProfilePage() {
  const { user } = useAuth();
  if (!user) return null; // the route is guarded; this only satisfies the type
  return (
    <>
      <PageHeader title="Profile" description="How you appear to your team." />
      <div className="grid gap-6 lg:grid-cols-3">
        <AccountCard user={user} />
        <PersonalInfoCard user={user} />
      </div>
    </>
  );
}

function AccountCard({ user }: { user: UserProfile }) {
  const verified = isEmailVerified(user);
  return (
    <Card className="content-start">
      <CardContent className="grid justify-items-center gap-2 pt-6 text-center">
        <Avatar name={fullName(user)} size="lg" decorative />
        <p className="text-lg font-semibold">{fullName(user)}</p>
        {user.jobTitle ? <p className="text-sm text-muted-foreground">{user.jobTitle}</p> : null}
        <RoleBadges roles={user.roles} />
      </CardContent>
      <CardContent>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Email</dt>
            <dd className="mt-0.5 break-all">{user.email}</dd>
            <dd
              className={`mt-1 flex items-center gap-1 text-xs ${verified ? 'text-success' : 'text-warning'}`}
            >
              {verified ? (
                <BadgeCheck aria-hidden="true" className="size-3.5" />
              ) : (
                <MailWarning aria-hidden="true" className="size-3.5" />
              )}
              {verified ? 'Verified' : 'Not verified yet'}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Member since</dt>
            <dd className="mt-0.5">{formatDate(user.createdAtUtc)}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Last sign-in</dt>
            <dd className="mt-0.5">
              {user.lastLoginAtUtc ? formatTimeAgo(user.lastLoginAtUtc) : 'Never'}
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

function PersonalInfoCard({ user }: { user: UserProfile }) {
  const toast = useToast();
  const save = useUpdateMyProfile();
  const canEdit = isEmailVerified(user); // PUT /api/users/me requires a verified email
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      jobTitle: user.jobTitle ?? '',
    },
  });

  const submit = handleSubmit(async (values) => {
    try {
      const saved = await save.mutateAsync(toProfileRequest(values));
      reset({
        firstName: saved.firstName,
        lastName: saved.lastName,
        jobTitle: saved.jobTitle ?? '',
      });
      toast.success('Profile saved');
    } catch (error) {
      applyServerErrors(setError, error, { fields: ['firstName', 'lastName', 'jobTitle'] });
    }
  });

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="Personal information"
        description="Your name is shown on tasks, comments and projects."
      />
      <CardContent>
        {canEdit ? null : (
          <p className="mb-4 text-sm text-warning">
            Verify your email address to change your profile.
          </p>
        )}
        <form noValidate onSubmit={submit} className="grid gap-4">
          <FormErrorSummary message={errors.root?.server?.message} />
          <fieldset disabled={!canEdit || isSubmitting} className="grid gap-4 sm:grid-cols-2">
            <FormField label="First name" required error={errors.firstName?.message}>
              {(controlProps) => (
                <Input
                  {...controlProps}
                  {...register('firstName')}
                  maxLength={NAME_MAX}
                  autoComplete="given-name"
                />
              )}
            </FormField>
            <FormField label="Last name" required error={errors.lastName?.message}>
              {(controlProps) => (
                <Input
                  {...controlProps}
                  {...register('lastName')}
                  maxLength={NAME_MAX}
                  autoComplete="family-name"
                />
              )}
            </FormField>
            <div className="sm:col-span-2">
              <FormField
                label="Job title"
                error={errors.jobTitle?.message}
                hint="Optional, e.g. Frontend Developer."
              >
                {(controlProps) => (
                  <Input
                    {...controlProps}
                    {...register('jobTitle')}
                    maxLength={JOB_TITLE_MAX}
                    autoComplete="organization-title"
                  />
                )}
              </FormField>
            </div>
          </fieldset>
          <p className="text-xs text-muted-foreground">
            Your email address can't be changed here. To change your password, go to{' '}
            <Link
              to={paths.settings('security')}
              className="font-medium text-primary hover:underline"
            >
              Settings › Security
            </Link>
            .
          </p>
          {canEdit ? (
            <div className="flex justify-end gap-2">
              <Button
                variant="secondary"
                disabled={!isDirty || isSubmitting}
                onClick={() => {
                  reset();
                }}
              >
                Discard changes
              </Button>
              <Button type="submit" isLoading={isSubmitting} disabled={!isDirty}>
                Save changes
              </Button>
            </div>
          ) : null}
        </form>
      </CardContent>
    </Card>
  );
}
