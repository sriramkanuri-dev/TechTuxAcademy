import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Download, ExternalLink, RotateCcw, ShieldOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { api, apiErrorMessage } from '@/lib/api';
import type { Certificate, Pagination } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/contexts/ToastContext';
import { SEO } from '@/components/seo/SEO';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
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

interface CertificatesResponse {
  certificates: Certificate[];
  pagination: Pagination;
}

export default function AdminCertificates() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [revoking, setRevoking] = useState<Certificate | null>(null);
  const [reason, setReason] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-certificates', search, status, page],
    queryFn: async () => {
      const { data } = await api.get<CertificatesResponse>('/admin/certificates', {
        params: { search, status, page, limit: 15 },
      });
      return data;
    },
  });

  const revoke = useMutation({
    mutationFn: async ({ id, revoked, reason }: { id: string; revoked: boolean; reason?: string }) => {
      const { data } = await api.patch<{ message: string }>(`/admin/certificates/${id}/revoke`, {
        revoked,
        reason: reason || null,
      });
      return data;
    },
    onSuccess: (result) => {
      toast.success(result.message);
      setRevoking(null);
      setReason('');
      void queryClient.invalidateQueries({ queryKey: ['admin-certificates'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  });

  const reinstate = (certificate: Certificate) =>
    revoke.mutate({ id: certificate.id, revoked: false });

  return (
    <>
      <SEO title="Manage certificates" noIndex />
      <AdminHeader
        title="Certificates"
        description="Every certificate has a unique ID and QR verification. Revoked certificates fail public verification."
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <AdminSearch
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
          placeholder="Search by ID, learner, email or course…"
        />
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value);
            setPage(1);
          }}
          aria-label="Filter by status"
          className="input-base w-full cursor-pointer sm:w-48"
        >
          <option value="">All statuses</option>
          <option value="valid">Valid</option>
          <option value="revoked">Revoked</option>
        </select>
      </div>

      {isLoading ? (
        <PageLoader label="Loading certificates…" />
      ) : isError || !data ? (
        <ErrorState title="Could not load certificates" onRetry={() => refetch()} />
      ) : data.certificates.length === 0 ? (
        <AdminEmpty>
          <Award className="mx-auto mb-3 h-8 w-8 text-brand-300/70" />
          No certificates match this view.
        </AdminEmpty>
      ) : (
        <>
          <TableWrap>
            <thead>
              <tr>
                <Th>Certificate</Th>
                <Th>Learner</Th>
                <Th>Course</Th>
                <Th>Issued</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {data.certificates.map((certificate) => {
                const pending = revoke.isPending && revoke.variables?.id === certificate.id;
                return (
                  <tr key={certificate.id} className="transition hover:bg-line/5">
                    <Td>
                      <p className="font-mono text-xs font-semibold text-brand-300">{certificate.certificateId}</p>
                      {certificate.revocationReason && (
                        <p className="mt-1 max-w-[220px] text-[11px] text-rose-300">{certificate.revocationReason}</p>
                      )}
                    </Td>
                    <Td>
                      <div className="min-w-[160px]">
                        <p className="font-medium text-text">{certificate.user?.name || '—'}</p>
                        <p className="text-xs text-muted">{certificate.user?.email}</p>
                      </div>
                    </Td>
                    <Td>{certificate.course?.title || '—'}</Td>
                    <Td className="whitespace-nowrap text-xs">{formatDate(certificate.issuedAt)}</Td>
                    <Td>
                      <Badge tone={certificate.revoked ? 'rose' : 'green'}>
                        {certificate.revoked ? 'Revoked' : 'Valid'}
                      </Badge>
                    </Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/verify-certificate/${certificate.certificateId}`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-line/5 hover:text-text"
                          aria-label="Verify certificate"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                        <a
                          href={`/api/certificates/${certificate.certificateId}/pdf`}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-line/5 hover:text-text"
                          aria-label="Download certificate PDF"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        {certificate.revoked ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            loading={pending}
                            onClick={() => reinstate(certificate)}
                          >
                            <RotateCcw className="h-3.5 w-3.5" /> Reinstate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-rose-300 hover:bg-rose-500/10"
                            onClick={() => {
                              setReason('');
                              setRevoking(certificate);
                            }}
                          >
                            <ShieldOff className="h-3.5 w-3.5" /> Revoke
                          </Button>
                        )}
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

      <Modal
        open={Boolean(revoking)}
        onClose={() => setRevoking(null)}
        title="Revoke certificate"
        description="The certificate will fail public verification. The learner keeps their record but the PDF is blocked."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRevoking(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={revoke.isPending}
              onClick={() => revoking && revoke.mutate({ id: revoking.id, revoked: true, reason })}
            >
              <ShieldOff className="h-4 w-4" /> Revoke certificate
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-line/10 bg-surface/40 p-4 text-sm">
            <p className="font-mono text-xs font-semibold text-brand-300">{revoking?.certificateId}</p>
            <p className="mt-1 font-medium text-text">{revoking?.user?.name}</p>
            <p className="text-xs text-muted">{revoking?.course?.title}</p>
          </div>
          <Textarea
            label="Reason (optional)"
            rows={3}
            maxLength={300}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explain why this certificate is being revoked. Visible in the admin record."
          />
        </div>
      </Modal>

      <div className="mt-6 rounded-2xl border border-brand-400/20 bg-brand-500/5 p-5 text-sm leading-7 text-muted">
        <p className="font-semibold text-text">Verification behaviour</p>
        <p className="mt-1">
          Public verification is available at{' '}
          <ButtonLink to="/verify-certificate" variant="ghost" size="sm" className="inline px-1">
            /verify-certificate
          </ButtonLink>
          . Valid certificates return learner, course and issue date. Revoked certificates return HTTP 410 and cannot
          be downloaded.
        </p>
      </div>
    </>
  );
}
