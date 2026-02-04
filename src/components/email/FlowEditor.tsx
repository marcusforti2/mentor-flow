import { useState, useCallback, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Node,
  Edge,
  MarkerType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  ArrowLeft,
  Save,
  Plus,
  Mail,
  Clock,
  GitBranch,
  Zap,
  Users,
  Calendar as CalendarIcon,
  AlertTriangle,
  Trophy,
  PlayCircle,
  Route,
  CalendarDays,
} from "lucide-react";
import FlowTestModal from './FlowTestModal';

// Custom Node Components
import TriggerNode from './nodes/TriggerNode';
import EmailNode from './nodes/EmailNode';
import WaitNode from './nodes/WaitNode';
import ConditionNode from './nodes/ConditionNode';

const nodeTypes = {
  trigger: TriggerNode,
  email: EmailNode,
  wait: WaitNode,
  condition: ConditionNode,
};

interface FlowEditorProps {
  flow: {
    id: string;
    name: string;
    nodes: any[];
    edges: any[];
  };
  templates: any[];
  onSave: (nodes: any[], edges: any[]) => void;
  onClose: () => void;
}

const TRIGGER_TYPES = [
  { value: 'onboarding', label: 'Entrada no Programa', icon: Users, description: 'Quando mentorado é cadastrado' },
  { value: 'jornada', label: 'Jornada do Cliente', icon: Route, description: 'Baseado no dia/semana da jornada' },
  { value: 'inactivity', label: 'Inatividade', icon: AlertTriangle, description: 'X dias sem acessar' },
  { value: 'trail_completion', label: 'Conclusão de Trilha', icon: Trophy, description: 'Quando finaliza uma trilha' },
  { value: 'date', label: 'Data Específica', icon: CalendarDays, description: 'Data fixa no calendário' },
  { value: 'manual', label: 'Disparo Manual', icon: Zap, description: 'Você inicia manualmente' },
];

const NODE_TEMPLATES = [
  { type: 'email', label: 'Enviar Email', icon: Mail, color: '#3b82f6' },
  { type: 'wait', label: 'Aguardar', icon: Clock, color: '#f59e0b' },
  { type: 'condition', label: 'Condição', icon: GitBranch, color: '#8b5cf6' },
];

export default function FlowEditor({ flow, templates, onSave, onClose }: FlowEditorProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(flow.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flow.edges || []);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isNodeSheetOpen, setIsNodeSheetOpen] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Initialize with trigger node if empty
  useEffect(() => {
    if (nodes.length === 0) {
      setNodes([
        {
          id: 'trigger-1',
          type: 'trigger',
          position: { x: 250, y: 50 },
          data: { 
            label: 'Gatilho',
            triggerType: 'onboarding',
            config: {}
          },
        },
      ]);
    }
  }, []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({
      ...params,
      markerEnd: { type: MarkerType.ArrowClosed },
      style: { strokeWidth: 2 },
    }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setIsNodeSheetOpen(true);
  }, []);

  const addNode = (type: string) => {
    const newNode: Node = {
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 250, y: nodes.length * 150 + 100 },
      data: getDefaultNodeData(type),
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const getDefaultNodeData = (type: string) => {
    switch (type) {
      case 'email':
        return { label: 'Enviar Email', subject: '', templateId: '', body: '' };
      case 'wait':
        return { label: 'Aguardar', duration: 1, unit: 'days' };
      case 'condition':
        return { label: 'Condição', conditionType: 'opened_email', config: {} };
      default:
        return { label: type };
    }
  };

  const updateNodeData = (nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId ? { ...node, data: { ...node.data, ...newData } } : node
      )
    );
  };

  const deleteNode = (nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId));
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
    setIsNodeSheetOpen(false);
    setSelectedNode(null);
  };

  const handleSave = () => {
    onSave(nodes, edges);
  };

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h2 className="text-xl font-bold">{flow.name}</h2>
            <p className="text-sm text-muted-foreground">Editor de Fluxo</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsTestModalOpen(true)}
            className="gap-2"
          >
            <PlayCircle className="h-4 w-4" />
            Testar Fluxo
          </Button>
          <Button onClick={handleSave} className="gradient-gold text-primary-foreground">
            <Save className="h-4 w-4 mr-2" />
            Salvar Fluxo
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          fitView
          className="flow-editor-canvas"
          defaultEdgeOptions={{
            style: { stroke: 'hsl(240 5% 60%)', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(240 5% 60%)' },
          }}
        >
          <Background color="hsl(240 5% 25%)" gap={20} size={1} />
          <Controls className="flow-controls" />
          <MiniMap 
            className="flow-minimap"
            nodeColor="hsl(45 100% 51%)"
            maskColor="hsl(240 10% 4% / 0.8)"
          />
          
          {/* Add Node Panel */}
          <Panel position="top-left" className="bg-card/95 backdrop-blur-sm border border-border rounded-xl p-4 shadow-xl">
            <p className="text-sm font-semibold text-foreground mb-3">Adicionar Etapa</p>
            <div className="flex gap-2">
              {NODE_TEMPLATES.map(template => (
                <Button
                  key={template.type}
                  variant="outline"
                  size="sm"
                  onClick={() => addNode(template.type)}
                  className="flex items-center gap-2 bg-secondary/50 hover:bg-secondary border-border text-foreground"
                >
                  <template.icon className="h-4 w-4" style={{ color: template.color }} />
                  <span>{template.label}</span>
                </Button>
              ))}
            </div>
          </Panel>
        </ReactFlow>
      </div>

      {/* Node Configuration Sheet */}
      <Sheet open={isNodeSheetOpen} onOpenChange={setIsNodeSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Configurar {String(selectedNode?.data?.label || '')}</SheetTitle>
            <SheetDescription>
              Configure os detalhes desta etapa do fluxo
            </SheetDescription>
          </SheetHeader>

          {selectedNode && (
            <div className="space-y-4 mt-6">
              {/* Trigger Node Config */}
              {selectedNode.type === 'trigger' && (
                <>
                  <div className="space-y-2">
                    <Label>Tipo de Gatilho</Label>
                    <Select
                      value={String(selectedNode.data.triggerType || 'onboarding')}
                      onValueChange={(value) => updateNodeData(selectedNode.id, { triggerType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIGGER_TYPES.map(trigger => (
                          <SelectItem key={trigger.value} value={trigger.value}>
                            <div className="flex items-center gap-2">
                              <trigger.icon className="h-4 w-4" />
                              <span>{trigger.label}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Inactivity Config */}
                  {selectedNode.data.triggerType === 'inactivity' && (
                    <div className="space-y-2">
                      <Label>Dias de Inatividade</Label>
                      <Input
                        type="number"
                        value={(selectedNode.data.config as any)?.days || 7}
                        onChange={(e) => updateNodeData(selectedNode.id, { 
                          config: { ...(selectedNode.data.config as any || {}), days: parseInt(e.target.value) }
                        })}
                      />
                    </div>
                  )}

                  {/* Specific Date Config */}
                  {selectedNode.data.triggerType === 'date' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Selecione a Data</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !(selectedNode.data.config as any)?.specificDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {(selectedNode.data.config as any)?.specificDate ? (
                                format(new Date((selectedNode.data.config as any).specificDate), "PPP", { locale: ptBR })
                              ) : (
                                <span>Escolha uma data</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0 z-[100]" align="start">
                            <Calendar
                              mode="single"
                              selected={(selectedNode.data.config as any)?.specificDate ? new Date((selectedNode.data.config as any).specificDate) : undefined}
                              onSelect={(date) => updateNodeData(selectedNode.id, { 
                                config: { ...(selectedNode.data.config as any || {}), specificDate: date?.toISOString() }
                              })}
                              initialFocus
                              className={cn("p-3 pointer-events-auto")}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        O fluxo será disparado para todos os mentorados na data selecionada.
                      </p>
                    </div>
                  )}

                  {/* Customer Journey Config */}
                  {selectedNode.data.triggerType === 'jornada' && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Tipo de Período</Label>
                        <Select
                          value={(selectedNode.data.config as any)?.periodType || 'day'}
                          onValueChange={(value) => updateNodeData(selectedNode.id, { 
                            config: { ...(selectedNode.data.config as any || {}), periodType: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="day">Dia específico</SelectItem>
                            <SelectItem value="week">Semana específica</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>
                          {(selectedNode.data.config as any)?.periodType === 'week' 
                            ? 'Semana da Jornada' 
                            : 'Dia da Jornada'}
                        </Label>
                        <Select
                          value={String((selectedNode.data.config as any)?.periodValue || 1)}
                          onValueChange={(value) => updateNodeData(selectedNode.id, { 
                            config: { ...(selectedNode.data.config as any || {}), periodValue: parseInt(value) }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-[200px]">
                            {(selectedNode.data.config as any)?.periodType === 'week' ? (
                              // Weeks 1-12
                              Array.from({ length: 12 }, (_, i) => i + 1).map(week => (
                                <SelectItem key={week} value={String(week)}>
                                  Semana {week}
                                </SelectItem>
                              ))
                            ) : (
                              // Days 1-90
                              Array.from({ length: 90 }, (_, i) => i + 1).map(day => (
                                <SelectItem key={day} value={String(day)}>
                                  Dia {day}
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                        <p className="text-sm text-foreground">
                          <strong>Exemplo:</strong>{' '}
                          {(selectedNode.data.config as any)?.periodType === 'week' 
                            ? `Todos os mentorados que estão na semana ${(selectedNode.data.config as any)?.periodValue || 1} da jornada receberão este fluxo.`
                            : `Todos os mentorados que estão no dia ${(selectedNode.data.config as any)?.periodValue || 1} da jornada receberão este fluxo.`
                          }
                        </p>
                      </div>

                      {/* Quick select badges */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Seleção rápida:</Label>
                        <div className="flex flex-wrap gap-2">
                          {(selectedNode.data.config as any)?.periodType === 'week' ? (
                            [1, 2, 4, 8, 12].map(week => (
                              <Badge 
                                key={week}
                                variant={(selectedNode.data.config as any)?.periodValue === week ? "default" : "outline"}
                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                onClick={() => updateNodeData(selectedNode.id, { 
                                  config: { ...(selectedNode.data.config as any || {}), periodValue: week }
                                })}
                              >
                                Semana {week}
                              </Badge>
                            ))
                          ) : (
                            [1, 3, 7, 14, 30, 60, 90].map(day => (
                              <Badge 
                                key={day}
                                variant={(selectedNode.data.config as any)?.periodValue === day ? "default" : "outline"}
                                className="cursor-pointer hover:bg-primary hover:text-primary-foreground"
                                onClick={() => updateNodeData(selectedNode.id, { 
                                  config: { ...(selectedNode.data.config as any || {}), periodValue: day }
                                })}
                              >
                                Dia {day}
                              </Badge>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Email Node Config */}
              {selectedNode.type === 'email' && (
                <>
                  <div className="space-y-2">
                    <Label>Assunto do Email</Label>
                    <Input
                      value={String(selectedNode.data.subject || '')}
                      onChange={(e) => updateNodeData(selectedNode.id, { subject: e.target.value })}
                      placeholder="Ex: Bem-vindo à mentoria!"
                    />
                  </div>
                  
                  {templates.length > 0 && (
                    <div className="space-y-2">
                      <Label>Usar Template</Label>
                      <Select
                        value={String(selectedNode.data.templateId || '')}
                        onValueChange={(value) => updateNodeData(selectedNode.id, { templateId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um template" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Nenhum (escrever manualmente)</SelectItem>
                          {templates.map(template => (
                            <SelectItem key={template.id} value={template.id}>
                              {template.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {!selectedNode.data.templateId && (
                    <div className="space-y-2">
                      <Label>Corpo do Email</Label>
                      <Textarea
                        value={String(selectedNode.data.body || '')}
                        onChange={(e) => updateNodeData(selectedNode.id, { body: e.target.value })}
                        placeholder="Escreva o conteúdo do email..."
                        rows={6}
                      />
                      <p className="text-xs text-muted-foreground">
                        Use {"{{nome}}"} para inserir o nome do mentorado
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Wait Node Config */}
              {selectedNode.type === 'wait' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Duração</Label>
                    <Input
                      type="number"
                      min={1}
                      value={Number(selectedNode.data.duration) || 1}
                      onChange={(e) => updateNodeData(selectedNode.id, { duration: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Unidade</Label>
                    <Select
                      value={String(selectedNode.data.unit || 'days')}
                      onValueChange={(value) => updateNodeData(selectedNode.id, { unit: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hours">Horas</SelectItem>
                        <SelectItem value="days">Dias</SelectItem>
                        <SelectItem value="weeks">Semanas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Condition Node Config */}
              {selectedNode.type === 'condition' && (
                <>
                  <div className="space-y-2">
                    <Label>Tipo de Condição</Label>
                    <Select
                      value={String(selectedNode.data.conditionType || 'opened_email')}
                      onValueChange={(value) => updateNodeData(selectedNode.id, { conditionType: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opened_email">Abriu o email anterior</SelectItem>
                        <SelectItem value="clicked_link">Clicou em link</SelectItem>
                        <SelectItem value="completed_trail">Completou trilha</SelectItem>
                        <SelectItem value="inactive_days">Dias sem acessar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Conecte a saída "Sim" para quando a condição for verdadeira e "Não" para quando for falsa.
                  </p>
                </>
              )}

              {/* Delete Button */}
              {selectedNode.type !== 'trigger' && (
                <Button
                  variant="destructive"
                  className="w-full mt-6"
                  onClick={() => deleteNode(selectedNode.id)}
                >
                  Remover Etapa
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Test Flow Modal */}
      <FlowTestModal
        open={isTestModalOpen}
        onOpenChange={setIsTestModalOpen}
        flowName={flow.name}
        nodes={nodes}
        templates={templates}
      />
    </div>
  );
}
