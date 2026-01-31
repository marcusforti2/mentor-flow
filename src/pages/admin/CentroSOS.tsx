import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertCircle,
  CheckCircle,
  Clock,
  MessageSquare,
  User,
  Bot,
  Send,
  Loader2,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface SOSRequest {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
  initial_guidance: string;
  ai_chat_history: ChatMessage[];
  ai_analysis: {
    summaryForMentor?: string;
    category?: string;
    priority?: string;
  };
  mentorado: {
    id: string;
    profiles: {
      full_name: string;
      email: string;
    };
  };
}

interface SOSResponse {
  id: string;
  message: string;
  created_at: string;
  responder_id: string;
}

export default function AdminCentroSOS() {
  const { user } = useAuth();
  const [sosRequests, setSOSRequests] = useState<SOSRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<SOSRequest | null>(null);
  const [responses, setResponses] = useState<SOSResponse[]>([]);
  const [newResponse, setNewResponse] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (user) {
      fetchSOSRequests();
    }
  }, [user]);

  const fetchSOSRequests = async () => {
    setIsLoading(true);

    try {
      const { data: mentor } = await supabase
        .from("mentors")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!mentor) return;

      const { data, error } = await supabase
        .from("sos_requests")
        .select(`
          *,
          mentorado:mentorados!inner(
            id,
            mentor_id,
            profiles:profiles!mentorados_user_id_fkey(full_name, email)
          )
        `)
        .eq("mentorado.mentor_id", mentor.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setSOSRequests((data as unknown as SOSRequest[]) || []);
    } catch (error) {
      console.error("Error fetching SOS requests:", error);
      toast.error("Erro ao carregar chamados");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchResponses = async (requestId: string) => {
    const { data, error } = await supabase
      .from("sos_responses")
      .select("*")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching responses:", error);
      return;
    }

    setResponses((data as SOSResponse[]) || []);
  };

  const openRequestSheet = async (request: SOSRequest) => {
    setSelectedRequest(request);
    await fetchResponses(request.id);
  };

  const updateStatus = async (requestId: string, newStatus: string) => {
    try {
      const updateData: Record<string, unknown> = { status: newStatus };
      if (newStatus === "resolved") {
        updateData.resolved_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("sos_requests")
        .update(updateData)
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Status atualizado!");
      fetchSOSRequests();

      if (selectedRequest?.id === requestId) {
        setSelectedRequest({ ...selectedRequest, status: newStatus });
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  const sendResponse = async () => {
    if (!newResponse.trim() || !selectedRequest || !user) return;

    setIsSending(true);

    try {
      const { error } = await supabase.from("sos_responses").insert({
        request_id: selectedRequest.id,
        responder_id: user.id,
        message: newResponse.trim(),
      });

      if (error) throw error;

      // Update status to in_progress if it was pending
      if (selectedRequest.status === "pending") {
        await updateStatus(selectedRequest.id, "in_progress");
      }

      toast.success("Resposta enviada!");
      setNewResponse("");
      await fetchResponses(selectedRequest.id);
    } catch (error) {
      console.error("Error sending response:", error);
      toast.error("Erro ao enviar resposta");
    } finally {
      setIsSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary">
            <Clock className="w-3 h-3 mr-1" />
            Aguardando
          </Badge>
        );
      case "in_progress":
        return (
          <Badge className="bg-amber-500">
            <MessageSquare className="w-3 h-3 mr-1" />
            Em andamento
          </Badge>
        );
      case "resolved":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="w-3 h-3 mr-1" />
            Resolvido
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "urgente":
        return <Badge variant="destructive">Urgente</Badge>;
      case "alta":
        return <Badge className="bg-orange-500">Alta</Badge>;
      case "média":
        return <Badge className="bg-amber-500">Média</Badge>;
      default:
        return <Badge variant="secondary">Baixa</Badge>;
    }
  };

  const filteredRequests = sosRequests.filter((r) =>
    statusFilter === "all" ? true : r.status === statusFilter
  );

  const pendingCount = sosRequests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">
            Centro SOS
          </h1>
          <p className="text-muted-foreground">
            Gerencie os chamados de ajuda dos seus mentorados
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="destructive" className="text-lg px-3 py-1">
            {pendingCount} pendente{pendingCount > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Aguardando</SelectItem>
            <SelectItem value="in_progress">Em andamento</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : filteredRequests.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-4" />
            <p className="text-muted-foreground">
              {statusFilter === "all"
                ? "Nenhum chamado SOS no momento."
                : `Nenhum chamado com status "${statusFilter}".`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <Card
              key={request.id}
              className={`cursor-pointer transition-colors hover:bg-accent/50 ${
                request.status === "pending" ? "border-amber-500/50" : ""
              }`}
              onClick={() => openRequestSheet(request)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">
                        {request.mentorado?.profiles?.full_name || "Mentorado"}
                      </span>
                    </div>
                    <h3 className="font-medium text-lg">{request.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {request.ai_analysis?.summaryForMentor || request.description}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(request.status)}
                      {request.priority && getPriorityBadge(request.priority)}
                      {request.category && (
                        <Badge variant="outline">{request.category}</Badge>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(request.created_at).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Request Detail Sheet */}
      <Sheet open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedRequest && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  Chamado SOS
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Mentorado info */}
                <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {selectedRequest.mentorado?.profiles?.full_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedRequest.mentorado?.profiles?.email}
                    </p>
                  </div>
                </div>

                {/* Status selector */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Status:</span>
                  <Select
                    value={selectedRequest.status}
                    onValueChange={(value) => updateStatus(selectedRequest.id, value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Aguardando</SelectItem>
                      <SelectItem value="in_progress">Em andamento</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                    </SelectContent>
                  </Select>
                  {selectedRequest.priority && getPriorityBadge(selectedRequest.priority)}
                  {selectedRequest.category && (
                    <Badge variant="outline">{selectedRequest.category}</Badge>
                  )}
                </div>

                {/* AI Summary */}
                {selectedRequest.ai_analysis?.summaryForMentor && (
                  <Card className="border-primary/50 bg-primary/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Bot className="w-4 h-4" />
                        Resumo da IA
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap">
                        {selectedRequest.ai_analysis.summaryForMentor}
                      </p>
                    </CardContent>
                  </Card>
                )}

                {/* Original description */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Descrição original:</h4>
                  <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                    {selectedRequest.description}
                  </p>
                </div>

                {/* AI Chat History */}
                {selectedRequest.ai_chat_history?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Conversa de triagem:</h4>
                    <ScrollArea className="h-[200px] border rounded-lg p-3">
                      <div className="space-y-3">
                        {selectedRequest.ai_chat_history.map((msg, idx) => (
                          <div
                            key={idx}
                            className={`flex gap-2 ${
                              msg.role === "user" ? "justify-end" : "justify-start"
                            }`}
                          >
                            {msg.role === "assistant" && (
                              <Bot className="w-4 h-4 text-primary flex-shrink-0 mt-1" />
                            )}
                            <div
                              className={`rounded-lg px-3 py-2 max-w-[85%] text-sm ${
                                msg.role === "user"
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted"
                              }`}
                            >
                              {msg.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {/* Initial guidance given */}
                {selectedRequest.initial_guidance && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <p className="text-xs font-medium text-green-600 mb-1">
                      💡 Direcionamento inicial dado ao mentorado:
                    </p>
                    <p className="text-sm">{selectedRequest.initial_guidance}</p>
                  </div>
                )}

                {/* Mentor Responses */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Suas respostas:</h4>
                  {responses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhuma resposta enviada ainda.
                    </p>
                  ) : (
                    <div className="space-y-3 mb-4">
                      {responses.map((response) => (
                        <div
                          key={response.id}
                          className="p-3 bg-primary/10 rounded-lg"
                        >
                          <p className="text-sm">{response.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(response.created_at).toLocaleString("pt-BR")}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* New response input */}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Escreva sua resposta para o mentorado..."
                      value={newResponse}
                      onChange={(e) => setNewResponse(e.target.value)}
                      rows={3}
                    />
                    <Button
                      onClick={sendResponse}
                      disabled={!newResponse.trim() || isSending}
                      className="w-full"
                    >
                      {isSending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Enviar Resposta
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
