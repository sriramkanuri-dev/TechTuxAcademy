import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MailCheck, MailX, ShieldCheck, Users } from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import type { Pagination, Role } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { SEO } from '@/components/seo/SEO';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Switch } from '@/components/ui/Input';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import {
  AdminEmpty,
  AdminHeader,
  AdminPager,
  AdminSearch,
  TableWrap,
  Td,
  Th,
} from '@/components/admin/AdminUI';

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: Role;
  disabled: boolean;
  emailVerified: boolean;
  avatar?: string | null;
  createdAt: string;
  lastLoginAt?: string | null;
  _count: { enrollments: number; certificates: number };
}

interface UsersResponse {
  users: AdminUserRow[];
  pagination: Pagination;
}

const roleTone: Record<Role, 'brand' | 'cyan' | 'neutral'> = {
  ADMIN: 'brand',
  INSTRUCTOR: 'cyan',
  STUDENT: 'neutral',
};

export default function AdminUsers() {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-users', search, role, page],
    queryFn: async () => {
      const { data } = await api.get<UsersResponse>('/admin/users', {
        params: { search, role, page, limit: 15 },
      });
      return data;
    },
  });

  const updateUser = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: { role?: Role; disabled?: boolean } }) => {
      const { data } = await api.patch<{ message: string }>(`/admin/users/${id}`, patch);
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      void queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  return (
    <>
      <SEO title="Manage users" noIndex />
      <AdminHeader
        title="Users"
        description="Change roles, verify email status and disable accounts. Every change is enforced server-side."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <AdminSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by name or email…"
        />
        <select
          value={role}
          onChange={(event) => {
            setRole(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by role"
          className="input-base w-full cursor-pointer sm:w-48"
        >
          <option value="">All roles</option>
          <option value="STUDENT">Students</option>
          <option value="INSTRUCTOR">Instructors</option>
          <option value="ADMIN">Admins</option>
        </select>
      </div>

      {isLoading ? (
        <PageLoader label="Loading users…" />
      ) : isError || !data ? (
        <ErrorState title="Could not load users" onRetry={() => refetch()} />
      ) : data.users.length === 0 ? (
        <AdminEmpty>
          <Users className="mx-auto mb-3 h-8 w-8 text-brand-300/70" />
          No users match this view.
        </AdminEmpty>
      ) : (
        <>
          <TableWrap>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Role</Th>
                <Th>Enrolments</Th>
                <Th>Certificates</Th>
                <Th>Email</Th>
                <Th>Joined</Th>
                <Th className="text-right">Active</Th>
              </tr>
            </thead>
            <tbody>
              {data.users.map((user) => {
                const isSelf = currentUser?.id === user.id;
                const pending = updateUser.isPending && updateUser.variables?.id === user.id;
                return (
                  <tr key={user.id} className="transition hover:bg-line/5">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={user.name} src={user.avatar} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-text">
                            {user.name}
                            {isSelf && <span className="ml-2 text-[11px] font-normal text-brand-300">You</span>}
                          </p>
                          <p className="truncate text-xs text-muted">{user.email}</p>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <select
                        value={user.role}
                        disabled={pending || isSelf}
                        onChange={(event) =>
                          updateUser.mutate({ id: user.id, patch: { role: event.target.value as Role } })
                        }
                        aria-label={`Role for ${user.name}`}
                        className="input-base h-8 w-32 cursor-pointer py-0 text-xs disabled:opacity-50"
                      >
                        <option value="STUDENT">Student</option>
                        <option value="INSTRUCTOR">Instructor</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                    </Td>
                    <Td className="text-xs">{user._count.enrollments}</Td>
                    <Td className="text-xs">{user._count.certificates}</Td>
                    <Td>
                      {user.emailVerified ? (
                        <Badge tone="green">
                          <MailCheck className="h-2.5 w-2.5" /> Verified
                        </Badge>
                      ) : (
                        <Badge tone="amber">
                          <MailX className="h-2.5 w-2.5" /> Unverified
                        </Badge>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-xs">{formatDate(user.createdAt)}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-2">
                        {user.role === 'ADMIN' && <ShieldCheck className="h-3.5 w-3.5 text-brand-300" />}
                        <Switch
                          checked={!user.disabled}
                          disabled={pending || isSelf}
                          onChange={(checked) => updateUser.mutate({ id: user.id, patch: { disabled: !checked } })}
                          label={user.disabled ? 'Disabled' : 'Active'}
                        />
                      </div>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableWrap>
          <AdminPager pagination={data.pagination} onPageChange={setPage} />
        </>
      )}
    </>
  );
}
