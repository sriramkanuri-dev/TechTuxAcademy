import { Link } from 'react-router-dom';
import { Award, Download, ExternalLink, ShieldAlert } from 'lucide-react';
import type { Certificate } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

export function CertificateCard({ certificate, admin }: { certificate: Certificate; admin?: boolean }) {
  const courseTitle = certificate.course?.title || 'Course';
  return (
    <div className="card-surface flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-400/25 bg-brand-500/10">
          <Award className="h-5 w-5 text-brand-300" />
        </div>
        {certificate.revoked ? (
          <Badge tone="rose">Revoked</Badge>
        ) : (
          <Badge tone="green">Valid</Badge>
        )}
      </div>
      <div>
        <h3 className="line-clamp-2 font-display text-base font-semibold text-text">{courseTitle}</h3>
        <p className="mt-1 text-xs text-muted">
          Issued {formatDate(certificate.issuedAt)}
        </p>
        <p className="mt-2 font-mono text-xs text-brand-300">{certificate.certificateId}</p>
      </div>
      <div className="mt-auto flex flex-wrap gap-2">
        {!certificate.revoked && (
          <a href={`/api/certificates/${certificate.certificateId}/pdf`} target="_blank" rel="noreferrer">
            <Button size="sm" variant="secondary">
              <Download className="h-3.5 w-3.5" />
              PDF
            </Button>
          </a>
        )}
        <Link to={`/verify-certificate/${certificate.certificateId}`}>
          <Button size="sm" variant="ghost">
            <ExternalLink className="h-3.5 w-3.5" />
            Verify
          </Button>
        </Link>
        {admin && certificate.revoked && (
          <span className="inline-flex items-center gap-1 text-xs text-rose-300">
            <ShieldAlert className="h-3.5 w-3.5" />
            {certificate.revocationReason || 'Revoked by admin'}
          </span>
        )}
      </div>
    </div>
  );
}
