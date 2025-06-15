// This file is intentionally left blank as it's being deleted or replaced by the dynamic route.
// The build process might remove it if it's no longer referenced or
// it can be removed manually if a specific redirect or landing page for /subsumption is not needed.
// For now, navigating to /subsumption will result in a 404 unless a
// src/app/subsumption/page.tsx or src/app/subsumption/[[...nodeId]]/page.tsx is created.

// To make /subsumption redirect to the default node's page, you could create
// a src/app/subsumption/page.tsx with the following content:
/*
import { redirect } from 'next/navigation';
import { specificNodeId } from '@/lib/constants';

export default function SubsumptionBasePage() {
  redirect(`/subsumption/${specificNodeId}`);
  // return null; // Or some loading state if redirect takes time, though usually it's fast.
}
*/
