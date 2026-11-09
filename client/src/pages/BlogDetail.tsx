import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Calendar, Clock, Copy, Share2, Tag, User } from 'lucide-react';
import { api, assetUrl } from '@/lib/api';
import type { BlogPost } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/contexts/ToastContext';
import { SEO } from '@/components/seo/SEO';
import { Markdown } from '@/components/Markdown';
import { Badge } from '@/components/ui/Badge';
import { ButtonLink } from '@/components/ui/Button';
import { GradientCover } from '@/components/ui/GradientCover';
import { PageLoader } from '@/components/ui/Spinner';
import { ErrorState } from '@/components/ui/ErrorState';
import { PostCard } from '@/components/cards/PostCard';

interface PostResponse {
  post: BlogPost;
  related: BlogPost[];
}

export default function BlogDetail() {
  const { slug = '' } = useParams();
  const { pick } = useLanguage();
  const toast = useToast();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['post', slug],
    queryFn: async () => {
      const { data } = await api.get<PostResponse>(`/posts/${slug}`);
      return data;
    },
    enabled: Boolean(slug),
  });

  if (isLoading) return <PageLoader label="Loading article…" />;
  if (isError || !data) {
    return (
      <div className="container-page py-20">
        <ErrorState title="Article not found" description="This article may have been moved or unpublished." onRetry={() => refetch()} />
      </div>
    );
  }

  const { post, related } = data;
  const title = pick(post.title, post.titleTe);
  const excerpt = pick(post.excerpt, post.excerptTe);
  const content = pick(post.content || '', post.contentTe);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard.');
    } catch {
      toast.error('Could not copy the link.');
    }
  };

  return (
    <>
      <SEO
        title={title}
        description={excerpt}
        path={`/blog/${slug}`}
        type="article"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.excerpt,
          datePublished: post.publishedAt,
          author: { '@type': 'Person', name: post.author?.name || 'TechTuxAcademy' },
          publisher: { '@type': 'Organization', name: 'TechTuxAcademy' },
        }}
      />

      <article>
        <div className="border-b border-line/10 bg-surface/30">
          <div className="container-page py-10">
            <Link to="/blog" className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition hover:text-text">
              <ArrowLeft className="h-3.5 w-3.5" /> All articles
            </Link>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              {post.category && (
                <Link to={`/categories/${post.category.slug}`}>
                  <Badge tone="brand">{pick(post.category.name, post.category.nameTe)}</Badge>
                </Link>
              )}
              {post.featured && <Badge tone="amber">Featured</Badge>}
            </div>
            <h1 className="mt-4 max-w-4xl font-display text-3xl font-bold leading-tight tracking-tight text-text sm:text-4xl">
              {title}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-8 text-muted">{excerpt}</p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <User className="h-4 w-4" /> {post.author?.name || 'TechTuxAcademy'}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> {formatDate(post.publishedAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" /> {post.readMinutes} min read
              </span>
              <button onClick={share} className="inline-flex items-center gap-1.5 rounded-lg border border-line/10 px-2.5 py-1 text-xs transition hover:border-brand-400/40 hover:text-text">
                <Share2 className="h-3.5 w-3.5" /> Share
              </button>
            </div>
          </div>
        </div>

        <div className="container-page grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            {post.coverImage ? (
              <img
                src={assetUrl(post.coverImage)}
                alt={title}
                className="mb-8 aspect-[16/7] w-full rounded-2xl border border-line/10 object-cover"
              />
            ) : (
              <GradientCover
                seed={post.slug}
                label={post.category?.name || 'Article'}
                color={post.category?.color || '#8b5cf6'}
                className="mb-8 aspect-[16/7] w-full"
              />
            )}
            {content ? (
              <Markdown content={content} />
            ) : (
              <p className="text-sm text-muted">The full article is being prepared.</p>
            )}

            {post.tags.length > 0 && (
              <div className="mt-10 flex flex-wrap items-center gap-2 border-t border-line/10 pt-6">
                <Tag className="h-4 w-4 text-muted" />
                {post.tags.map((tag) => (
                  <Link key={tag} to={`/search?q=${encodeURIComponent(tag)}`}>
                    <Badge tone="neutral">#{tag}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="card-surface p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">About the author</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-brand-400/30 bg-brand-gradient font-semibold text-white">
                  {(post.author?.name || 'T').charAt(0)}
                </span>
                <div>
                  <p className="text-sm font-semibold text-text">{post.author?.name || 'TechTuxAcademy'}</p>
                  <p className="text-xs text-muted">Writer & instructor</p>
                </div>
              </div>
              {post.author?.bio && <p className="mt-3 text-sm leading-6 text-muted">{post.author.bio}</p>}
            </div>

            <div className="rounded-2xl border border-brand-400/20 bg-brand-500/5 p-5 text-sm leading-7 text-muted">
              <p className="font-semibold text-text">Learn by building</p>
              <p className="mt-1">Pair this article with a structured, hands-on course.</p>
              <ButtonLink to="/courses" size="sm" className="mt-3">
                Browse courses <ArrowRight className="h-3.5 w-3.5" />
              </ButtonLink>
            </div>

            <button
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copied.');
                } catch {
                  toast.error('Could not copy the link.');
                }
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-line/10 bg-card px-4 py-2.5 text-sm text-muted transition hover:border-brand-400/40 hover:text-text"
            >
              <Copy className="h-4 w-4" /> Copy link
            </button>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="border-t border-line/10 bg-surface/30">
            <div className="container-page py-14">
              <h2 className="mb-6 font-display text-2xl font-bold text-text">Related articles</h2>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {related.map((item) => (
                  <PostCard key={item.id} post={item} />
                ))}
              </div>
            </div>
          </section>
        )}
      </article>
    </>
  );
}
