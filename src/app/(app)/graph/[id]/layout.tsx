/**
 * Graph Workspace Layout — Notes & Edges
 * Route: /graph/:id
 *
 * Mounts the ThreeZoneLayout with all three zones wired up,
 * plus the UploadSheet overlay (triggered from CommandBar).
 */

import { ThreeZoneLayout } from '@/components/layout/ThreeZoneLayout';
import { CommandBar } from '@/components/layout/CommandBar';
import { ContextSidebar } from '@/components/layout/ContextSidebar';
import { GraphCanvas } from '@/components/graph/GraphCanvas';
import { UploadSheet } from '@/components/panels/UploadSheet';
import { RightPanel } from '@/components/panels/RightPanel';
import { SearchPalette } from '@/components/panels/SearchPalette';
import { LazyGraphQuizDrawer } from '@/components/graph/LazyGraphQuizDrawer';
import { SidebarProjectList } from '@/components/sidebar/SidebarProjectList';
import { GraphIntelligenceSummary } from '@/components/sidebar/GraphIntelligenceSummary';

interface GraphWorkspaceLayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export default async function GraphWorkspaceLayout({
  children,
  params,
}: GraphWorkspaceLayoutProps) {
  const { id } = await params;

  return (
    <>
      <ThreeZoneLayout
        commandBar={<CommandBar graphId={id} projectName="My Knowledge Graph" />}
        sidebar={
          <ContextSidebar>
            <GraphIntelligenceSummary />
            <SidebarProjectList />
          </ContextSidebar>
        }
        canvas={
          <>
            <GraphCanvas />
            {children}
          </>
        }
        nodeDetailPanel={<RightPanel />}
      />
      {/* Fixed overlays */}
      <UploadSheet />
      <SearchPalette />
      <LazyGraphQuizDrawer />
    </>
  );
}
