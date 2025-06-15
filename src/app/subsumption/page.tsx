
import { redirect } from 'next/navigation';
import { specificNodeId } from '@/lib/constants';

export default function SubsumptionBasePage() {
  redirect(`/subsumption/${specificNodeId}`);
  // Return null or a loading indicator if needed, though redirect is usually fast.
  // For server components, redirect() is sufficient and a return value isn't strictly rendered.
}
