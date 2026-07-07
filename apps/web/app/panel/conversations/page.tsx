import { fa } from '@khodkar/shared';
import { EmptyState } from '../empty-state';

export const runtime = 'nodejs';

export default function ConversationsPage() {
  return <EmptyState title={fa.panel.conversations.title} message={fa.panel.conversations.empty} />;
}
