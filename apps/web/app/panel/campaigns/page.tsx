import { fa } from '@khodkar/shared';
import { EmptyState } from '../empty-state';

export const runtime = 'nodejs';

export default function CampaignsPage() {
  return <EmptyState title={fa.panel.campaigns.title} message={fa.panel.campaigns.empty} />;
}
