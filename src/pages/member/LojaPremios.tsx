import { useState } from "react";
import { useGamification } from "@/hooks/useGamification";
import { BadgeCard, BadgeGrid } from "@/components/gamification/BadgeCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Gift,
  Trophy,
  Star,
  Package,
  Calendar,
  Clock,
  CheckCircle2,
  Loader2,
  ShoppingBag,
  Award,
} from "lucide-react";
import { toast } from "sonner";

export default function LojaPremios() {
  const {
    badges,
    stats,
    rewards,
    redemptions,
    isLoading,
    redeemReward,
    isBadgeUnlocked,
    getBadgeUnlockDate,
  } = useGamification();

  const [selectedReward, setSelectedReward] = useState<string | null>(null);
  const [shippingAddress, setShippingAddress] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  const selectedRewardData = rewards.find((r) => r.id === selectedReward);

  const handleRedeem = async () => {
    if (!selectedReward) return;

    setIsRedeeming(true);
    const result = await redeemReward(selectedReward, shippingAddress);
    setIsRedeeming(false);

    if (result.success) {
      toast.success("Prêmio resgatado com sucesso!", {
        description: "Você receberá uma confirmação em breve.",
      });
      setSelectedReward(null);
      setShippingAddress("");
    } else {
      toast.error("Erro ao resgatar", {
        description: result.error,
      });
    }
  };

  const unlockedBadges = badges.filter((b) => isBadgeUnlocked(b.id));
  const lockedBadges = badges.filter((b) => !isBadgeUnlocked(b.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            Loja de Prêmios
          </h1>
          <p className="text-muted-foreground mt-1">
            Troque seus pontos por recompensas exclusivas
          </p>
        </div>
        <div className="glass-card px-6 py-3 rounded-2xl flex items-center gap-3">
          <Star className="h-6 w-6 text-primary" />
          <div>
            <p className="text-2xl font-bold text-gradient-gold">
              {stats?.totalPoints || 0}
            </p>
            <p className="text-xs text-muted-foreground">pontos disponíveis</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="loja" className="space-y-6">
        <TabsList className="glass-card p-1">
          <TabsTrigger value="loja" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            Loja
          </TabsTrigger>
          <TabsTrigger value="conquistas" className="gap-2">
            <Award className="h-4 w-4" />
            Minhas Conquistas
          </TabsTrigger>
          <TabsTrigger value="historico" className="gap-2">
            <Clock className="h-4 w-4" />
            Histórico
          </TabsTrigger>
        </TabsList>

        {/* Loja de Prêmios */}
        <TabsContent value="loja" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {rewards.map((reward) => {
              const canAfford = (stats?.totalPoints || 0) >= reward.points_cost;
              const outOfStock = reward.stock !== null && reward.stock <= 0;

              return (
                <Card
                  key={reward.id}
                  className={`glass-card p-6 transition-all hover:border-primary/40 ${
                    !canAfford || outOfStock ? "opacity-60" : ""
                  }`}
                >
                  <div className="flex flex-col h-full">
                    {/* Icon/Image */}
                    <div className="h-24 w-24 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                      {reward.category === "session" ? (
                        <Calendar className="h-12 w-12 text-primary" />
                      ) : reward.category === "event" ? (
                        <Trophy className="h-12 w-12 text-primary" />
                      ) : (
                        <Gift className="h-12 w-12 text-primary" />
                      )}
                    </div>

                    {/* Info */}
                    <h3 className="text-lg font-semibold text-foreground text-center">
                      {reward.name}
                    </h3>
                    <p className="text-sm text-muted-foreground text-center mt-1 flex-1">
                      {reward.description}
                    </p>

                    {/* Stock */}
                    {reward.stock !== null && (
                      <div className="flex items-center justify-center gap-1 mt-3 text-xs text-muted-foreground">
                        <Package className="h-3 w-3" />
                        {outOfStock
                          ? "Esgotado"
                          : `${reward.stock} disponíveis`}
                      </div>
                    )}

                    {/* Price & Action */}
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-center">
                        <span className="text-2xl font-bold text-gradient-gold">
                          {reward.points_cost}
                        </span>
                        <span className="text-muted-foreground ml-1">pts</span>
                      </div>

                      <Button
                        className="w-full"
                        variant={canAfford && !outOfStock ? "default" : "outline"}
                        disabled={!canAfford || outOfStock}
                        onClick={() => setSelectedReward(reward.id)}
                      >
                        {outOfStock
                          ? "Esgotado"
                          : canAfford
                          ? "Resgatar"
                          : `Faltam ${reward.points_cost - (stats?.totalPoints || 0)} pts`}
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {rewards.length === 0 && (
            <div className="text-center py-12">
              <Gift className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">
                Nenhum prêmio disponível
              </h3>
              <p className="text-muted-foreground">
                Em breve teremos novidades!
              </p>
            </div>
          )}
        </TabsContent>

        {/* Minhas Conquistas */}
        <TabsContent value="conquistas" className="space-y-6">
          {/* Unlocked Badges */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              Conquistas Desbloqueadas ({unlockedBadges.length})
            </h2>
            {unlockedBadges.length > 0 ? (
              <BadgeGrid className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {unlockedBadges.map((badge) => (
                  <BadgeCard
                    key={badge.id}
                    name={badge.name}
                    description={badge.description || ""}
                    iconType={badge.icon_url}
                    points={badge.points_required || 0}
                    unlocked={true}
                    unlockedAt={getBadgeUnlockDate(badge.id)}
                    size="md"
                  />
                ))}
              </BadgeGrid>
            ) : (
              <Card className="glass-card p-8 text-center">
                <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Você ainda não desbloqueou nenhuma conquista.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Continue usando a plataforma para ganhar badges!
                </p>
              </Card>
            )}
          </div>

          {/* Locked Badges */}
          <div>
            <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Próximas Conquistas ({lockedBadges.length})
            </h2>
            <BadgeGrid className="grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {lockedBadges.map((badge) => (
                <BadgeCard
                  key={badge.id}
                  name={badge.name}
                  description={badge.description || ""}
                  iconType={badge.icon_url}
                  points={badge.points_required || 0}
                  unlocked={false}
                  size="md"
                />
              ))}
            </BadgeGrid>
          </div>
        </TabsContent>

        {/* Histórico de Resgates */}
        <TabsContent value="historico" className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Histórico de Resgates
          </h2>

          {redemptions.length > 0 ? (
            <div className="space-y-3">
              {redemptions.map((redemption) => (
                <Card
                  key={redemption.id}
                  className="glass-card p-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Gift className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground">
                        {redemption.reward?.name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(redemption.redeemed_at).toLocaleDateString(
                          "pt-BR"
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-primary">
                      -{redemption.points_spent} pts
                    </p>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        redemption.status === "fulfilled"
                          ? "bg-emerald-500/20 text-emerald-500"
                          : redemption.status === "pending"
                          ? "bg-amber-500/20 text-amber-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {redemption.status === "fulfilled"
                        ? "Entregue"
                        : redemption.status === "pending"
                        ? "Pendente"
                        : redemption.status}
                    </span>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="glass-card p-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Você ainda não resgatou nenhum prêmio.
              </p>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Redeem Dialog */}
      <Dialog open={!!selectedReward} onOpenChange={() => setSelectedReward(null)}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle>Resgatar {selectedRewardData?.name}</DialogTitle>
            <DialogDescription>
              Você irá gastar{" "}
              <span className="text-primary font-medium">
                {selectedRewardData?.points_cost} pontos
              </span>{" "}
              para resgatar este prêmio.
            </DialogDescription>
          </DialogHeader>

          {selectedRewardData?.category === "physical" && (
            <div className="space-y-4 py-4">
              <label className="text-sm font-medium text-foreground">
                Endereço de Entrega
              </label>
              <Textarea
                placeholder="Rua, número, complemento, bairro, cidade, estado, CEP"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedReward(null)}
              disabled={isRedeeming}
            >
              Cancelar
            </Button>
            <Button onClick={handleRedeem} disabled={isRedeeming}>
              {isRedeeming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resgatando...
                </>
              ) : (
                "Confirmar Resgate"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
