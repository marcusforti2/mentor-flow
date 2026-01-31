import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  UserCheck, 
  Clock, 
  Search, 
  CheckCircle, 
  XCircle,
  Loader2,
  Mail,
  Calendar,
  Shield
} from "lucide-react";

interface PendingUser {
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

interface Mentorado {
  id: string;
  user_id: string;
  status: string | null;
  joined_at: string | null;
  profile: {
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
}

const Mentorados = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [mentorados, setMentorados] = useState<Mentorado[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchData = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Fetch pending users (profiles without roles)
      const { data: pending, error: pendingError } = await supabase
        .rpc('get_pending_users');
      
      if (pendingError) throw pendingError;
      setPendingUsers(pending || []);
      
      // Fetch existing mentorados
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (mentorData) {
        const { data: mentoradosData, error: mentoradosError } = await supabase
          .from('mentorados')
          .select(`
            id,
            user_id,
            status,
            joined_at
          `)
          .eq('mentor_id', mentorData.id);
        
        if (mentoradosError) throw mentoradosError;
        
        // Fetch profiles for mentorados
        if (mentoradosData && mentoradosData.length > 0) {
          const userIds = mentoradosData.map(m => m.user_id);
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, email, avatar_url')
            .in('user_id', userIds);
          
          const mentoradosWithProfiles = mentoradosData.map(m => ({
            ...m,
            profile: profiles?.find(p => p.user_id === m.user_id) || null
          }));
          
          setMentorados(mentoradosWithProfiles);
        } else {
          setMentorados([]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleApprove = async (userId: string) => {
    if (!user) return;
    
    setApprovingId(userId);
    
    try {
      // Get mentor ID
      const { data: mentorData } = await supabase
        .from('mentors')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!mentorData) {
        throw new Error('Mentor não encontrado');
      }
      
      // Approve the mentorado
      const { error } = await supabase.rpc('approve_mentorado', {
        _user_id: userId,
        _mentor_id: mentorData.id
      });
      
      if (error) throw error;
      
      toast({
        title: "Mentorado aprovado!",
        description: "O usuário agora pode acessar a plataforma.",
      });
      
      // Refresh data
      await fetchData();
    } catch (error: any) {
      console.error('Error approving user:', error);
      toast({
        title: "Erro ao aprovar",
        description: error.message || "Não foi possível aprovar o usuário.",
        variant: "destructive",
      });
    } finally {
      setApprovingId(null);
    }
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const formatDate = (date: string | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const filteredPending = pendingUsers.filter(u => 
    (u.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (u.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  const filteredMentorados = mentorados.filter(m => 
    (m.profile?.full_name?.toLowerCase() || "").includes(searchTerm.toLowerCase()) ||
    (m.profile?.email?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Mentorados</h1>
          <p className="text-muted-foreground">Gerencie e aprove novos mentorados</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              className="pl-10 w-64 bg-secondary/50"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-yellow-500/10">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pendingUsers.length}</p>
                <p className="text-sm text-muted-foreground">Aguardando aprovação</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <UserCheck className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {mentorados.filter(m => m.status === 'active').length}
                </p>
                <p className="text-sm text-muted-foreground">Mentorados ativos</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/10">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{mentorados.length}</p>
                <p className="text-sm text-muted-foreground">Total de mentorados</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="pending" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Clock className="w-4 h-4 mr-2" />
            Pendentes ({pendingUsers.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <UserCheck className="w-4 h-4 mr-2" />
            Ativos ({mentorados.length})
          </TabsTrigger>
        </TabsList>
        
        {/* Pending Users Tab */}
        <TabsContent value="pending" className="mt-6">
          {filteredPending.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhum usuário pendente
                </h3>
                <p className="text-muted-foreground">
                  Novos usuários que se cadastrarem aparecerão aqui para aprovação.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPending.map((pendingUser) => (
                <Card key={pendingUser.user_id} className="glass-card hover:border-primary/30 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarImage src={pendingUser.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(pendingUser.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">
                          {pendingUser.full_name || "Sem nome"}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{pendingUser.email}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>Cadastro: {formatDate(pendingUser.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => handleApprove(pendingUser.user_id)}
                        disabled={approvingId === pendingUser.user_id}
                        className="flex-1 gradient-gold text-primary-foreground"
                        size="sm"
                      >
                        {approvingId === pendingUser.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Active Mentorados Tab */}
        <TabsContent value="active" className="mt-6">
          {filteredMentorados.length === 0 ? (
            <Card className="glass-card">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhum mentorado ainda
                </h3>
                <p className="text-muted-foreground">
                  Aprove usuários pendentes para que eles se tornem seus mentorados.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMentorados.map((mentorado) => (
                <Card key={mentorado.id} className="glass-card hover:border-primary/30 transition-colors">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-12 w-12 border-2 border-green-500/30">
                        <AvatarImage src={mentorado.profile?.avatar_url || undefined} />
                        <AvatarFallback className="bg-green-500/10 text-green-500">
                          {getInitials(mentorado.profile?.full_name || null)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-foreground truncate">
                            {mentorado.profile?.full_name || "Sem nome"}
                          </h3>
                          <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                            Ativo
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{mentorado.profile?.email}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3" />
                          <span>Desde: {formatDate(mentorado.joined_at)}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Mentorados;
