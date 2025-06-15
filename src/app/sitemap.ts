
import { MetadataRoute } from 'next';
import { specificNodeId } from '@/lib/constants';

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
      // Point to the default node's subsumption page
      url: `${baseUrl}/subsumption/${specificNodeId}`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // If you had dynamic pages (e.g., /blog/[slug]), you would fetch their paths
  // and add them here. For the /subsumption/[nodeId] route, we generally don't list
  // all possible nodeIds in a sitemap. Search engines will discover them through links
  // or if explicitly submitted. The entry above ensures the main/default view is listed.

  return staticPages;
}
