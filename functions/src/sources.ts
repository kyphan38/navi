// Trusted sources for the weekly digest and the postmortem of the week (owner, 2026-11-26).
// Only well-known engineering blogs and newsletters with web pages: a digest item must
// link to one of them, or it is dropped. Aggregators (Hacker News, Lobsters, daily.dev),
// email-only newsletters and podcasts are left out: their links are not the article itself.
// Sites that block the link check (Uber 406, Finextra 403) are left out too: their links never pass.
// AI News (smol.ai) now redirects to latent.space, which is on the list.
// InfoQ, The New Stack and The Register come in as headlines from their RSS feeds (community.ts).
// Pure file: the root test suite imports it.

export type Topic = 'devops' | 'cloud' | 'ai' | 'payments';
/** `path`: only pages under this path count (a blog inside a bigger site). */
export type Source = { name: string; host: string; path?: string; topic: Topic };

export const NEWS_SOURCES: readonly Source[] = [
  // DevOps, SRE, platform
  { name: 'Cloudflare Blog', host: 'blog.cloudflare.com', topic: 'devops' },
  { name: 'Kubernetes Blog', host: 'kubernetes.io', path: '/blog/', topic: 'devops' },
  { name: 'CNCF Blog', host: 'cncf.io', path: '/blog/', topic: 'devops' },
  { name: 'SRE Weekly', host: 'sreweekly.com', topic: 'devops' },
  { name: 'DevOps Weekly', host: 'devopsweekly.com', topic: 'devops' },
  { name: 'HashiCorp Blog', host: 'hashicorp.com', path: '/blog/', topic: 'devops' },
  { name: 'Grafana Labs Blog', host: 'grafana.com', path: '/blog/', topic: 'devops' },
  { name: 'GitHub Blog', host: 'github.blog', topic: 'devops' },
  { name: 'Netflix TechBlog', host: 'netflixtechblog.com', topic: 'devops' },
  { name: 'Discord Engineering', host: 'discord.com', path: '/blog/', topic: 'devops' },
  { name: 'Fly.io Blog', host: 'fly.io', path: '/blog/', topic: 'devops' },
  { name: 'Tailscale Blog', host: 'tailscale.com', path: '/blog/', topic: 'devops' },
  { name: 'The Pragmatic Engineer', host: 'newsletter.pragmaticengineer.com', topic: 'devops' },
  { name: 'ByteByteGo', host: 'blog.bytebytego.com', topic: 'devops' },
  { name: 'Quastor', host: 'quastor.org', topic: 'devops' },
  { name: 'Jeff Geerling', host: 'jeffgeerling.com', path: '/blog/', topic: 'devops' },
  // Cloud
  { name: 'AWS Architecture Blog', host: 'aws.amazon.com', path: '/blogs/architecture/', topic: 'cloud' },
  { name: 'AWS Security Blog', host: 'aws.amazon.com', path: '/blogs/security/', topic: 'cloud' },
  { name: "AWS What's New", host: 'aws.amazon.com', path: '/about-aws/whats-new/', topic: 'cloud' },
  { name: 'Last Week in AWS', host: 'lastweekinaws.com', topic: 'cloud' },
  // AI engineering (kept small: the focus is DevOps / Platform)
  { name: 'Anthropic Engineering', host: 'anthropic.com', path: '/engineering/', topic: 'ai' },
  { name: "Simon Willison's Weblog", host: 'simonwillison.net', topic: 'ai' },
  { name: 'Latent Space', host: 'latent.space', topic: 'ai' },
  // Banking and payments technology
  { name: 'Stripe Blog', host: 'stripe.com', path: '/blog/', topic: 'payments' },
  { name: 'Monzo Blog', host: 'monzo.com', path: '/blog/', topic: 'payments' },
  { name: 'Building Nubank', host: 'building.nu.com', topic: 'payments' },
];

/** Public incident reports: status pages and engineering blogs of well-known companies. */
export const POSTMORTEM_SOURCES: readonly Source[] = [
  { name: 'AWS', host: 'aws.amazon.com', path: '/message/', topic: 'cloud' },
  { name: 'AWS', host: 'aws.amazon.com', path: '/premiumsupport/technology/pes/', topic: 'cloud' },
  { name: 'Google Cloud', host: 'status.cloud.google.com', path: '/incidents/', topic: 'cloud' },
  { name: 'Cloudflare', host: 'blog.cloudflare.com', topic: 'devops' },
  { name: 'GitHub', host: 'github.blog', topic: 'devops' },
  { name: 'Atlassian', host: 'atlassian.com', path: '/engineering/', topic: 'devops' },
  { name: 'Atlassian', host: 'atlassian.com', path: '/blog/', topic: 'devops' },
  { name: 'Discord', host: 'discord.com', path: '/blog/', topic: 'devops' },
  { name: 'Fly.io', host: 'fly.io', path: '/blog/', topic: 'devops' },
  { name: 'Tailscale', host: 'tailscale.com', path: '/blog/', topic: 'devops' },
  { name: 'Stripe', host: 'stripe.com', path: '/blog/', topic: 'payments' },
  { name: 'Monzo', host: 'monzo.com', path: '/blog/', topic: 'payments' },
];

/** The source a URL belongs to (host or a subdomain of it, and the path when set); null when none. */
export function sourceOf(url: string, list: readonly Source[]): Source | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.toLowerCase().replace(/^www\./, '');
  // Some sites put a locale before the path (uber.com/en-VN/blog/...).
  const path = u.pathname.replace(/^\/[a-z]{2}(-[a-z]{2})?(?=\/)/i, '');
  return list.find((s) => (host === s.host || host.endsWith(`.${s.host}`)) && (!s.path || path.startsWith(s.path) || u.pathname.startsWith(s.path))) ?? null;
}

/** The list for a prompt: one line per source, "name (host/path)". */
export function sourceLines(list: readonly Source[], topics?: readonly Topic[]): string {
  return list
    .filter((s) => !topics || topics.includes(s.topic))
    .map((s) => `- ${s.name} (${s.host}${s.path ?? ''})`)
    .join('\n');
}
