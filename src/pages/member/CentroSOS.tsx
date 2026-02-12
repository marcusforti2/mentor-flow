import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/contexts/TenantContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Send,
  Loader2,
  CheckCircle,
  Clock,
  MessageSquare,
  Plus,
  Bot,
  User,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface TriageResult {
  message: string;
  needsMoreInfo: boolean;
  category?: string;
  priority?: string;
  summaryForMentor?: string;
  initialGuidance?: string;
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
}

export default function CentroSOS() {
  const { user } = useAuth();
  const { activeMembership } = useTenant();
  const [mentoradoId, setMentoradoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("novo");
  const [problemDescription, setProblemDescription] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [triageStarted, setTriageStarted] = useState(false);
  const [triageComplete, setTriageComplete] = useState(false);
  const [lastTriageResult, setLastTriageResult] = useState<TriageResult | null>(null);
  const [sosRequests, setSOSRequests] = useState<SOSRequest[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchMentoradoId();
    }
  }, [user, activeMembership]);

  useEffect(() => {
    if (mentoradoId) {
      fetchSOSRequests();
    }
  }, [mentoradoId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const fetchMentoradoId = async () => {
    if (!user) return;
    
    // Try legacy mentorados table first (has FK to sos_requests)
    const { data: mentorado } = await supabase
      .from("mentorados")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    
    if (mentorado) {
      setMentoradoId(mentorado.id);
    } else if (activeMembership?.id) {
      // Fallback to membership ID
      setMentoradoId(activeMembership.id);
    }
  };

  const fetchSOSRequests = async () => {
    if (!mentoradoId) return;

    // Query SOS requests by mentorado_id OR tenant_id
    let query = supabase
      .from("sos_requests")
      .select("*")
      .eq("mentorado_id", mentoradoId)
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching SOS requests:", error);
      return;
    }

    setSOSRequests((data as unknown as SOSRequest[]) || []);
  };

  const startTriage = async () => {
    if (!problemDescription.trim()) {
      toast.error("Descreva seu problema antes de continuar");
      return;
    }

    setIsAnalyzing(true);
    setTriageStarted(true);

    try {
      // Get full business context
      const { data: businessProfile } = await supabase
        .from("mentorado_business_profiles")
        .select("*")
        .eq("mentorado_id", mentoradoId)
        .single();

      const businessContext = businessProfile ? {
        businessName: businessProfile.business_name,
        businessType: businessProfile.business_type,
        targetAudience: businessProfile.target_audience,
        mainOffer: businessProfile.main_offer,
        priceRange: businessProfile.price_range,
        uniqueValueProposition: businessProfile.unique_value_proposition,
        painPointsSolved: businessProfile.pain_points_solved,
        idealClientProfile: businessProfile.ideal_client_profile,
      } : undefined;

      const { data, error } = await supabase.functions.invoke("sos-triage", {
        body: {
          problemDescription,
          chatHistory: [],
          businessContext,
        },
      });

      if (error) throw error;

      const result = data as TriageResult;
      setLastTriageResult(result);

      // Add to chat history
      setChatHistory([
        { role: "user", content: problemDescription },
        { role: "assistant", content: result.message },
      ]);

      if (!result.needsMoreInfo) {
        setTriageComplete(true);
      }
    } catch (error) {
      console.error("Error in triage:", error);
      toast.error("Erro ao processar. Tente novamente.");
      setTriageStarted(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const sendMessage = async () => {
    if (!currentMessage.trim() || isAnalyzing) return;

    const userMessage = currentMessage.trim();
    setCurrentMessage("");
    setIsAnalyzing(true);

    const newHistory = [...chatHistory, { role: "user" as const, content: userMessage }];
    setChatHistory(newHistory);

    try {
      const { data: businessProfile } = await supabase
        .from("mentorado_business_profiles")
        .select("*")
        .eq("mentorado_id", mentoradoId)
        .single();

      const businessContext = businessProfile ? {
        businessName: businessProfile.business_name,
        businessType: businessProfile.business_type,
        targetAudience: businessProfile.target_audience,
        mainOffer: businessProfile.main_offer,
        priceRange: businessProfile.price_range,
        uniqueValueProposition: businessProfile.unique_value_proposition,
        painPointsSolved: businessProfile.pain_points_solved,
        idealClientProfile: businessProfile.ideal_client_profile,
      } : undefined;

      const { data, error } = await supabase.functions.invoke("sos-triage", {
        body: {
          problemDescription: "",
          chatHistory: newHistory,
          businessContext,
        },
      });

      if (error) throw error;

      const result = data as TriageResult;
      setLastTriageResult(result);

      setChatHistory([...newHistory, { role: "assistant", content: result.message }]);

      if (!result.needsMoreInfo) {
        setTriageComplete(true);
      }
    } catch (error) {
      console.error("Error in chat:", error);
      toast.error("Erro ao enviar mensagem");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const submitSOSRequest = async () => {
    if (!mentoradoId || !lastTriageResult) return;

    setIsSubmitting(true);

    try {
      const title =
        problemDescription.length > 50
          ? problemDescription.substring(0, 50) + "..."
          : problemDescription;

      // Get mentorado profile info for email
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", user?.id)
        .single();

      const insertData = {
        mentorado_id: mentoradoId,
        title,
        description: lastTriageResult.summaryForMentor || problemDescription,
        priority: lastTriageResult.priority || "média",
        category: lastTriageResult.category || "outro",
        status: "pending",
        initial_guidance: lastTriageResult.initialGuidance,
        ai_chat_history: chatHistory as unknown,
        ai_analysis: lastTriageResult as unknown,
        tenant_id: activeMembership?.tenant_id || null,
        membership_id: activeMembership?.id || null,
      };

      const { error } = await supabase.from("sos_requests").insert(insertData as never);

      if (error) throw error;

      // Send email notifications
      try {
        await supabase.functions.invoke("send-sos-notification", {
          body: {
            mentoradoId,
            mentoradoName: profile?.full_name || "Mentorado",
            mentoradoEmail: profile?.email || "",
            sosTitle: title,
            sosDescription: lastTriageResult.summaryForMentor || problemDescription,
            sosPriority: lastTriageResult.priority || "média",
            sosCategory: lastTriageResult.category || "outro",
            initialGuidance: lastTriageResult.initialGuidance || "",
          },
        });
        console.log("Email notifications sent successfully");
      } catch (emailError) {
        console.error("Error sending email notifications:", emailError);
        // Don't fail the whole operation if email fails
      }

      toast.success("🚨 Chamado SOS enviado! Jacob e Mari foram notificados por email.");

      // Reset form
      setProblemDescription("");
      setChatHistory([]);
      setTriageStarted(false);
      setTriageComplete(false);
      setLastTriageResult(null);

      // Refresh list
      fetchSOSRequests();
      setActiveTab("historico");
    } catch (error) {
      console.error("Error submitting SOS:", error);
      toast.error("Erro ao enviar chamado");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setProblemDescription("");
    setChatHistory([]);
    setTriageStarted(false);
    setTriageComplete(false);
    setLastTriageResult(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Aguardando</Badge>;
      case "in_progress":
        return <Badge className="bg-amber-500"><MessageSquare className="w-3 h-3 mr-1" />Em andamento</Badge>;
      case "resolved":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Resolvido</Badge>;
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

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Centro SOS</h1>
          <p className="text-muted-foreground">Peça ajuda e receba orientação personalizada</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="novo" className="gap-2">
            <Plus className="w-4 h-4" />
            Novo Chamado
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <Clock className="w-4 h-4" />
            Histórico ({sosRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="novo" className="mt-6">
          {!triageStarted ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  Descreva seu problema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Conte o que está acontecendo... O Mentor Virtual vai entender sua situação e preparar o sinal de SOS para Jacob e Mari."
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <div className="flex justify-end">
                  <Button onClick={startTriage} disabled={!problemDescription.trim() || isAnalyzing}>
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <Bot className="w-4 h-4 mr-2" />
                        Falar com Mentor Virtual
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Chat area */}
              <Card className="lg:col-span-2">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Bot className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div>
                      <span className="text-lg">Mentor Virtual 24/7</span>
                      <p className="text-xs text-muted-foreground font-normal">Seu coach de vendas está aqui para ajudar</p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-[400px] pr-4">
                    <div className="space-y-4">
                      {chatHistory.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          {msg.role === "assistant" && (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Bot className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <div
                            className={`rounded-lg px-4 py-3 max-w-[80%] ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          {msg.role === "user" && (
                            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
                              <User className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      ))}
                      {isAnalyzing && (
                        <div className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <Bot className="w-4 h-4 text-primary" />
                          </div>
                          <div className="bg-muted rounded-lg px-4 py-3">
                            <Loader2 className="w-4 h-4 animate-spin" />
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>

                  {!triageComplete && (
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Digite sua resposta..."
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        rows={2}
                        className="resize-none"
                      />
                      <Button onClick={sendMessage} disabled={!currentMessage.trim() || isAnalyzing}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {triageComplete && (
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={resetForm}>
                        Cancelar
                      </Button>
                      <Button onClick={submitSOSRequest} disabled={isSubmitting}>
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Enviar para o Mentor
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Guidance panel */}
              {triageComplete && lastTriageResult?.initialGuidance && (
                <Card className="border-green-500/50 bg-green-500/5">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      Direcionamento Inicial
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {lastTriageResult.initialGuidance}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {lastTriageResult.category && (
                        <Badge variant="outline">{lastTriageResult.category}</Badge>
                      )}
                      {lastTriageResult.priority && getPriorityBadge(lastTriageResult.priority)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      💡 Comece a aplicar essas dicas enquanto aguarda o contato do seu mentor.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="historico" className="mt-6">
          {sosRequests.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">Você ainda não abriu nenhum chamado SOS.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sosRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <h3 className="font-medium">{request.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {request.description}
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
                        {new Date(request.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                    {request.initial_guidance && (
                      <div className="mt-4 p-3 bg-muted rounded-lg">
                        <p className="text-xs font-medium text-muted-foreground mb-1">
                          💡 Direcionamento inicial:
                        </p>
                        <p className="text-sm">{request.initial_guidance}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
