import { useQuery } from '@tanstack/react-query';
import { Award, BadgeCheck, ShieldAlert } from 'lucide-react';
import { api } from '@/lib/api';
import type { Certificate } from '@/lib/types';
import { SEO } from '@/components/seo/SEO';
import { StatCard } from '@/components/ui/StatCard';
import { CertificateCard } from '@/components/CertificateCard';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ButtonLink } from '@/components/ui/Button';

interface CertificatesResponse {
  certificates: Certificate[];
}

export default function Certificates() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-certificates'],
    queryFn: async () => {
      const { data } = await api.get<CertificatesResponse>('/me/certificates');
      return data.certificates;
    },
  });

  if (isLoading) return <PageLoader label="Loading your certificates…" />;
  if (isError || !data) return <ErrorState title="Could not load your certificates" onRetry={() => refetch()} />;

  const valid = data.filter((certificate) => !certificate.revoked);
  const revoked = data.filter((certificate) => certificate.revoked);

  return (
    <>
      <SEO title="My certificates" noIndex />
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text sm:text-3xl">Certificates</h1>
        <p className="mt-1 text-sm text-muted">
          Every certificate carries a unique ID and a public verification page. Download the PDF or share the
          verification link.
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Total certificates" value={data.length} icon={Award} tone="brand" />
        <StatCard label="Valid" value={valid.length} icon={BadgeCheck} tone="green" />
        <StatCard label="Revoked" value={revoked.length} icon={ShieldAlert} tone="rose" />
      </div>

      {data.length === 0 ? (
        <EmptyState
          icon={Award}
          title="No certificates yet"
          description="Complete a course to the certificate threshold and your verifiable certificate will appear here automatically."
          action={<ButtonLink to="/dashboard/courses">Go to my courses</ButtonLink>}
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((certificate) => (
            <CertificateCard key={certificate.id} certificate={certificate} />
          ))}
        </div>
      )}

      <div className="mt-8 rounded-2xl border border-brand-400/20 bg-brand-500/5 p-5 text-sm leading-7 text-muted">
        <p className="font-semibold text-text">How verification works</p>
        <p className="mt-1">
          Anyone can confirm a certificate at the{' '}
          <a href="/verify-certificate" className="font-medium text-brand-300 hover:text-brand-200">
            public verification page
          </a>{' '}
          using the certificate ID or the QR code printed on the PDF. Revoked certificates are marked clearly.
        </p>
      </div>
    </>
  );
}
