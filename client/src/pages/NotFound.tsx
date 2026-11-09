import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, Search } from 'lucide-react';
import { SEO } from '@/components/seo/SEO';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <>
      <SEO title="Page not found" noIndex />
      <div className="container-page flex min-h-[70vh] flex-col items-center justify-center py-20 text-center">
        <p className="font-display text-[7rem] font-black leading-none gradient-text sm:text-[10rem]">404</p>
        <h1 className="mt-2 font-display text-2xl font-bold text-text sm:text-3xl">This page took a wrong turn</h1>
        <p className="mt-3 max-w-md text-sm leading-7 text-muted">
          The page you are looking for may have moved, or the link might be incomplete. Try searching
          the academy or browse the course catalogue.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <ButtonLink to="/">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </ButtonLink>
          <ButtonLink to="/courses" variant="secondary">
            <Compass className="h-4 w-4" />
            Browse courses
          </ButtonLink>
          <ButtonLink to="/search" variant="ghost">
            <Search className="h-4 w-4" />
            Search
          </ButtonLink>
        </div>
        <p className="mt-10 text-xs text-muted">
          Looking for a certificate?{' '}
          <Link to="/verify-certificate" className="text-brand-300 hover:text-brand-200">
            Verify it here
          </Link>
          .
        </p>
      </div>
    </>
  );
}
