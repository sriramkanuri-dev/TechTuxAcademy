import { Helmet } from 'react-helmet-async';

const SITE = 'https://techtuxacademy.online';

interface SEOProps {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article' | 'course';
  noIndex?: boolean;
  jsonLd?: Record<string, unknown>;
}

export function SEO({
  title,
  description = 'TechTuxAcademy is a modern technology learning platform for Linux, programming, AI, electronics, VLSI, DevOps and cybersecurity. Learn in English or Telugu.',
  path = '',
  image,
  type = 'website',
  noIndex,
  jsonLd,
}: SEOProps) {
  const fullTitle = title ? `${title} · TechTuxAcademy` : 'TechTuxAcademy — Master Technology. Build Your Future.';
  const url = `${SITE}${path}`;
  const ogImage = image || `${SITE}/logo.svg`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:type" content={type === 'course' ? 'website' : type} />
      <meta property="og:site_name" content="TechTuxAcademy" />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
}
