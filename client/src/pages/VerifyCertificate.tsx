import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Award,
  BadgeCheck,
  Calendar,
  Download,
  ExternalLink,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { api, apiErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { SEO } from '@/components/seo/SEO';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

interface VerifiedCertificate {
  certificateId: string;
  studentName: string;
  courseTitle: string;
  courseTitleTe?: string | null;
  courseSlug: string;
  category: string;
  difficulty: string;
  issuedAt: string;
  revoked: boolean;
  revokedAt?: string | null;
  status: 'valid' | 'revoked';
}

interface VerifyResponse {
  valid: boolean;
  certificate: VerifiedCertificate;
}

export default function VerifyCertificate() {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const certificateId = params.certificateId || searchParams.get('id') || '';
  const [input, setInput] = useState(certificateId);
  const [error, setError] = useState('');

  const { data, isLoading, isError, error: queryError } = useQuery({
    queryKey: ['verify-certificate', certificateId],
    queryFn: async () => {
      const { data } = await api.get<VerifyResponse>(`/certificates/verify/${encodeURIComponent(certificateId)}`);
      return data;
    },
    enabled: Boolean(certificateId),
    retry: false,
  });

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = input.trim();
    if (!value) {
      setError('Enter a certificate ID to verify.');
      return;
    }
    setError('');
    navigate(`/verify-certificate/${encodeURIComponent(value)}`);
  };

  return (
    <>
      <SEO
        title="Verify a certificate"
        description="Verify a TechTuxAcademy certificate instantly using its unique certificate ID and QR code."
        path="/verify-certificate"
      />
      <PageHeader
        eyebrow="Certificate verification"
        title="Verify a TechTuxAcademy certificate"
        description="Every certificate carries a unique ID and a QR code. Enter the ID below to confirm the holder, course and issue date."
        breadcrumb={[{ label: 'Verify certificate' }]}
      />

      <section className="container-page grid gap-10 py-12 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <div className="card-surface p-6">
            <h2 className="font-display text-lg font-semibold text-text">Check a certificate</h2>
            <p className="mt-1 text-sm text-muted">
              The ID format is <span className="font-mono text-text/80">TTA-YYYY-XXXXXXXXXX</span>.
            </p>
            <form onSubmit={submit} className="mt-5 space-y-4">
              <Input
                label="Certificate ID"
                value={input}
                onChange={(event) => setInput(event.target.value.toUpperCase())}
                placeholder="TTA-2026-DEMO0001"
                error={error}
                autoComplete="off"
              />
              <Button type="submit" className="w-full">
                <Search className="h-4 w-4" />
                Verify certificate
              </Button>
            </form>
            <p className="mt-4 text-xs leading-6 text-muted">
              Tip: the QR code printed on the certificate opens this page with the ID pre-filled.
              Verification is public and does not require an account.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-brand-400/20 bg-brand-500/5 p-5 text-sm leading-7 text-muted">
            <ShieldCheck className="mb-2 h-5 w-5 text-brand-300" />
            A valid result confirms that the named learner completed the course on TechTuxAcademy and
            met the certificate threshold. Revoked certificates are clearly marked.
          </div>

          <div className="mt-4 rounded-2xl border border-line/10 bg-card p-5 text-sm leading-7 text-muted">
            <p className="font-semibold text-text">Have a certificate?</p>
            <p className="mt-1">
              Sign in to download your PDF from the{' '}
              <Link to="/dashboard/certificates" className="font-medium text-brand-300 hover:text-brand-200">
                certificate dashboard
              </Link>
              .
            </p>
          </div>
        </div>

        <div>
          {!certificateId ? (
            <div className="flex h-full min-h-[320px] flex-col items-center justify-center rounded-2xl border border-dashed border-line/15 bg-surface/40 p-8 text-center">
              <Award className="h-10 w-10 text-brand-300/70" />
              <h3 className="mt-4 font-display text-lg font-semibold text-text">Awaiting a certificate ID</h3>
              <p className="mt-1 max-w-sm text-sm text-muted">
                Enter an ID on the left, or scan the QR code on a certificate to verify it instantly.
              </p>
            </div>
          ) : isLoading ? (
            <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-line/10 bg-card">
              <Spinner className="h-8 w-8" />
            </div>
          ) : isError || !data ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-500/10 p-8 text-center">
              <ShieldAlert className="mx-auto h-10 w-10 text-rose-300" />
              <h3 className="mt-4 font-display text-lg font-semibold text-text">Certificate not found</h3>
              <p className="mt-1 text-sm text-rose-100/80">
                {queryError ? apiErrorMessage(queryError) : 'No certificate matches that ID. Check the ID and try again.'}
              </p>
              <p className="mt-3 font-mono text-xs text-rose-200/70">{certificateId}</p>
            </div>
          ) : (
            <div
              className={`overflow-hidden rounded-2xl border bg-card shadow-card ${
                data.certificate.revoked ? 'border-rose-400/30' : 'border-emerald-400/30'
              }`}
            >
              <div className={`flex items-center gap-3 px-6 py-4 ${data.certificate.revoked ? 'bg-rose-500/10' : 'bg-emerald-500/10'}`}>
                {data.certificate.revoked ? (
                  <ShieldAlert className="h-6 w-6 text-rose-300" />
                ) : (
                  <BadgeCheck className="h-6 w-6 text-emerald-300" />
                )}
                <div>
                  <p className="text-sm font-semibold text-text">
                    {data.certificate.revoked ? 'Certificate revoked' : 'Certificate verified'}
                  </p>
                  <p className="text-xs text-muted">
                    {data.certificate.revoked
                      ? 'This certificate is no longer valid.'
                      : 'This is a genuine TechTuxAcademy certificate.'}
                  </p>
                </div>
                <Badge tone={data.certificate.revoked ? 'rose' : 'green'} className="ml-auto">
                  {data.certificate.revoked ? 'Revoked' : 'Valid'}
                </Badge>
              </div>

              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">Awarded to</p>
                <p className="mt-1 font-display text-2xl font-bold text-text">{data.certificate.studentName}</p>

                <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-muted">For completing</p>
                <p className="mt-1 text-lg font-semibold text-text">{data.certificate.courseTitle}</p>

                <dl className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Certificate ID</dt>
                    <dd className="mt-1 break-all font-mono text-xs text-brand-300">{data.certificate.certificateId}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Issue date</dt>
                    <dd className="mt-1 inline-flex items-center gap-1.5 text-sm text-text">
                      <Calendar className="h-4 w-4 text-muted" /> {formatDate(data.certificate.issuedAt)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Category</dt>
                    <dd className="mt-1 text-sm text-text">{data.certificate.category}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-muted">Level</dt>
                    <dd className="mt-1 text-sm text-text">
                      {data.certificate.difficulty.charAt(0) + data.certificate.difficulty.slice(1).toLowerCase()}
                    </dd>
                  </div>
                </dl>

                {data.certificate.revoked && data.certificate.revokedAt && (
                  <p className="mt-5 rounded-xl border border-rose-400/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-200">
                    Revoked on {formatDate(data.certificate.revokedAt)}.
                  </p>
                )}

                <div className="mt-6 flex flex-wrap gap-2 border-t border-line/10 pt-5">
                  {!data.certificate.revoked && (
                    <a
                      href={`/api/certificates/${data.certificate.certificateId}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Button size="sm" variant="secondary">
                        <Download className="h-3.5 w-3.5" /> Download PDF
                      </Button>
                    </a>
                  )}
                  <ButtonLink to={`/courses/${data.certificate.courseSlug}`} size="sm" variant="ghost">
                    <ExternalLink className="h-3.5 w-3.5" /> View course
                  </ButtonLink>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
