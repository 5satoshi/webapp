import { MetadataRoute } from 'next';

// IMPORTANT: Update this if your production domain is different
const baseUrl = 'https://www.five-satoshi.com';

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/channels`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/analytics`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/subsumption`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // If you had dynamic pages (e.g., /blog/[slug]), you would fetch their paths
  // and add them here. For this dashboard, all pages are static.

  return staticPages;
}
