import { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { type Automation, getAutomationMeta } from '@/hooks/useAutomations';
import { AutomationFlowNode, type AutomationNodeData } from './AutomationFlowNode';
import { AutomationDetailSheet } from './AutomationDetailSheet';

const nodeTypes = { automationNode: AutomationFlowNode };

/* ── Trigger (virtual) nodes ── */
const TRIGGERS = [
  { id: 'trigger_new_mentee', label: 'Novo Mentorado', icon: 'play' },
  { id: 'trigger_meeting', label: 'Reunião Agendada', icon: 'calendar-clock' },
  { id: 'trigger_month_end', label: 'Fim do Mês', icon: 'bar-chart-3' },
  { id: 'trigger_lead_created', label: 'Lead Criado', icon: 'target' },
];

/* ── Predefined edges (logical flow) ── */
const EDGE_DEFS: [string, string][] = [
  ['trigger_new_mentee', 'welcome_onboarding'],
  ['welcome_onboarding', 'weekly_digest'],
  ['weekly_digest', 're_engage_inactive'],
  ['re_engage_inactive', 'check_alerts'],
  ['check_badges', 'celebrate_achievements'],
  ['trigger_meeting', 'meeting_reminder'],
  ['trigger_month_end', 'monthly_mentor_report'],
  ['trigger_lead_created', 'auto_qualify_lead'],
  ['auto_qualify_lead', 'send_prospection_tips'],
];

/* ── Column layout ── */
const COL_X: Record<string, number> = {
  trigger: 0,
  communication: 300,
  engagement: 600,
  intelligence: 900,
  growth: 1200,
};

const COL_LABEL: Record<string, string> = {
  trigger: 'Gatilhos',
  communication: 'Comunicação',
  engagement: 'Engajamento',
  intelligence: 'Inteligência',
  growth: 'Crescimento',
};

interface Props {
  automations: Automation[];
  onToggle: (id: string, enabled: boolean) => void;
  onUpdateConfig: (id: string, config: Record<string, any>) => void;
  onRunNow: (key: string) => void;
  runningKey: string | null;
}

export function AutomationFlowView({ automations, onToggle, onUpdateConfig, onRunNow, runningKey }: Props) {
  const [selectedAutomation, setSelectedAutomation] = useState<Automation | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const { initialNodes, initialEdges } = useMemo(() => {
    // Count how many items per column to arrange vertically
    const colCounters: Record<string, number> = {};
    const Y_GAP = 140;
    const Y_OFFSET = 60;

    const getY = (col: string) => {
      colCounters[col] = (colCounters[col] || 0) + 1;
      return Y_OFFSET + (colCounters[col] - 1) * Y_GAP;
    };

    // Trigger nodes
    const triggerNodes: Node[] = TRIGGERS.map((t) => ({
      id: t.id,
      type: 'automationNode',
      position: { x: COL_X.trigger, y: getY('trigger') },
      data: {
        label: t.label,
        icon: t.icon,
        category: 'trigger',
        isEnabled: true,
        lastRunStatus: null,
        lastRunAt: null,
        frequencyLabel: '',
        automationKey: t.id,
        automationId: '',
        isTrigger: true,
      } satisfies AutomationNodeData,
    }));

    // Automation nodes
    const autoNodes: Node[] = automations.map((a) => {
      const meta = getAutomationMeta(a.automation_key);
      const col = meta.category;
      return {
        id: a.automation_key,
        type: 'automationNode',
        position: { x: COL_X[col] ?? 600, y: getY(col) },
        data: {
          label: meta.label,
          icon: meta.icon,
          category: meta.category,
          isEnabled: a.is_enabled,
          lastRunStatus: a.last_run_status,
          lastRunAt: a.last_run_at,
          frequencyLabel: meta.frequencyLabel,
          automationKey: a.automation_key,
          automationId: a.id,
          isTrigger: false,
        } satisfies AutomationNodeData,
      };
    });

    // Build edge list from pre-defs, only if both ends exist
    const allIds = new Set([...triggerNodes.map(n => n.id), ...autoNodes.map(n => n.id)]);
    const edges: Edge[] = EDGE_DEFS
      .filter(([s, t]) => allIds.has(s) && allIds.has(t))
      .map(([source, target], i) => ({
        id: `e-${source}-${target}`,
        source,
        target,
        animated: true,
        style: { stroke: 'hsl(var(--primary) / 0.4)', strokeWidth: 2 },
      }));

    return { initialNodes: [...triggerNodes, ...autoNodes], initialEdges: edges };
  }, [automations]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const d = node.data as unknown as AutomationNodeData;
    if (d.isTrigger) return;
    const found = automations.find(a => a.automation_key === d.automationKey);
    if (found) {
      setSelectedAutomation(found);
      setSheetOpen(true);
    }
  }, [automations]);

  return (
    <div className="h-[calc(100vh-220px)] min-h-[500px] rounded-xl border border-border/50 overflow-hidden bg-background/50">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        className="automation-flow"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} className="!bg-background" />
        <Controls className="!bg-card !border-border/50 !shadow-lg [&_button]:!bg-card [&_button]:!border-border/50 [&_button]:!text-foreground [&_button:hover]:!bg-muted" />
        <MiniMap
          className="!bg-card !border-border/50"
          nodeColor={(n) => {
            const d = n.data as unknown as AutomationNodeData;
            if (d.category === 'trigger') return 'hsl(var(--muted-foreground))';
            if (d.category === 'engagement') return '#3b82f6';
            if (d.category === 'intelligence') return '#a855f7';
            if (d.category === 'communication') return '#f59e0b';
            if (d.category === 'growth') return '#10b981';
            return 'hsl(var(--primary))';
          }}
        />
      </ReactFlow>

      <AutomationDetailSheet
        automation={selectedAutomation}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        onToggle={onToggle}
        onUpdateConfig={onUpdateConfig}
        onRunNow={onRunNow}
        running={runningKey === selectedAutomation?.automation_key}
      />
    </div>
  );
}
