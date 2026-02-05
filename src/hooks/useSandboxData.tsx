 import { useMemo } from 'react';
 
 // Sandbox data for preview purposes
 // This doesn't create actual users - just provides mock data for UI preview
 
 export interface SandboxMentee {
   id: string;
   name: string;
   email: string;
   businessName: string;
   avatarUrl: string | null;
   progress: number;
   points: number;
   streak: number;
   joinedAt: string;
   lastActive: string;
   status: 'active' | 'inactive' | 'at_risk';
 }
 
 export interface SandboxTrailProgress {
   trailId: string;
   trailName: string;
   progress: number;
   completedLessons: number;
   totalLessons: number;
 }
 
 export interface SandboxRanking {
   position: number;
   menteeId: string;
   menteeName: string;
   points: number;
   change: 'up' | 'down' | 'same';
 }
 
 const SANDBOX_MENTEES: SandboxMentee[] = [
   { id: 'sb-1', name: 'Ana Silva', email: 'ana.silva@preview.local', businessName: 'Ana Silva Consultoria', avatarUrl: null, progress: 85, points: 1250, streak: 12, joinedAt: '2025-11-15', lastActive: '2026-02-05', status: 'active' },
   { id: 'sb-2', name: 'Bruno Costa', email: 'bruno.costa@preview.local', businessName: 'Costa Vendas', avatarUrl: null, progress: 72, points: 980, streak: 8, joinedAt: '2025-12-01', lastActive: '2026-02-04', status: 'active' },
   { id: 'sb-3', name: 'Carla Santos', email: 'carla.santos@preview.local', businessName: 'Santos & Associados', avatarUrl: null, progress: 95, points: 1580, streak: 21, joinedAt: '2025-10-20', lastActive: '2026-02-05', status: 'active' },
   { id: 'sb-4', name: 'Diego Oliveira', email: 'diego.oliveira@preview.local', businessName: 'DO Consultoria', avatarUrl: null, progress: 45, points: 520, streak: 3, joinedAt: '2026-01-10', lastActive: '2026-02-03', status: 'at_risk' },
   { id: 'sb-5', name: 'Elena Ferreira', email: 'elena.ferreira@preview.local', businessName: 'Ferreira Solutions', avatarUrl: null, progress: 68, points: 890, streak: 6, joinedAt: '2025-11-28', lastActive: '2026-02-05', status: 'active' },
   { id: 'sb-6', name: 'Felipe Almeida', email: 'felipe.almeida@preview.local', businessName: 'Almeida Negócios', avatarUrl: null, progress: 32, points: 340, streak: 0, joinedAt: '2026-01-20', lastActive: '2026-01-28', status: 'inactive' },
   { id: 'sb-7', name: 'Gabriela Lima', email: 'gabriela.lima@preview.local', businessName: 'GL Vendas', avatarUrl: null, progress: 78, points: 1120, streak: 15, joinedAt: '2025-11-05', lastActive: '2026-02-05', status: 'active' },
   { id: 'sb-8', name: 'Henrique Souza', email: 'henrique.souza@preview.local', businessName: 'HS Consultoria', avatarUrl: null, progress: 55, points: 650, streak: 4, joinedAt: '2025-12-15', lastActive: '2026-02-04', status: 'active' },
   { id: 'sb-9', name: 'Isabela Rodrigues', email: 'isabela.rodrigues@preview.local', businessName: 'IR Soluções', avatarUrl: null, progress: 90, points: 1420, streak: 18, joinedAt: '2025-10-10', lastActive: '2026-02-05', status: 'active' },
   { id: 'sb-10', name: 'João Pereira', email: 'joao.pereira@preview.local', businessName: 'JP Vendas', avatarUrl: null, progress: 62, points: 780, streak: 7, joinedAt: '2025-12-05', lastActive: '2026-02-05', status: 'active' },
   { id: 'sb-11', name: 'Karen Martins', email: 'karen.martins@preview.local', businessName: 'KM Consultoria', avatarUrl: null, progress: 38, points: 410, streak: 2, joinedAt: '2026-01-15', lastActive: '2026-02-02', status: 'at_risk' },
   { id: 'sb-12', name: 'Lucas Gomes', email: 'lucas.gomes@preview.local', businessName: 'Gomes & Partners', avatarUrl: null, progress: 82, points: 1180, streak: 14, joinedAt: '2025-11-10', lastActive: '2026-02-05', status: 'active' },
   { id: 'sb-13', name: 'Mariana Ribeiro', email: 'mariana.ribeiro@preview.local', businessName: 'MR Solutions', avatarUrl: null, progress: 70, points: 920, streak: 9, joinedAt: '2025-11-25', lastActive: '2026-02-04', status: 'active' },
   { id: 'sb-14', name: 'Nicolas Araújo', email: 'nicolas.araujo@preview.local', businessName: 'NA Vendas', avatarUrl: null, progress: 48, points: 560, streak: 3, joinedAt: '2026-01-08', lastActive: '2026-02-03', status: 'at_risk' },
   { id: 'sb-15', name: 'Olívia Barbosa', email: 'olivia.barbosa@preview.local', businessName: 'Barbosa Consultoria', avatarUrl: null, progress: 88, points: 1350, streak: 16, joinedAt: '2025-10-25', lastActive: '2026-02-05', status: 'active' },
   { id: 'sb-16', name: 'Pedro Carvalho', email: 'pedro.carvalho@preview.local', businessName: 'PC Soluções', avatarUrl: null, progress: 58, points: 720, streak: 5, joinedAt: '2025-12-10', lastActive: '2026-02-04', status: 'active' },
   { id: 'sb-17', name: 'Quésia Nunes', email: 'quesia.nunes@preview.local', businessName: 'QN Vendas', avatarUrl: null, progress: 75, points: 1020, streak: 11, joinedAt: '2025-11-18', lastActive: '2026-02-05', status: 'active' },
   { id: 'sb-18', name: 'Rafael Dias', email: 'rafael.dias@preview.local', businessName: 'RD Consultoria', avatarUrl: null, progress: 42, points: 480, streak: 1, joinedAt: '2026-01-25', lastActive: '2026-02-01', status: 'at_risk' },
   { id: 'sb-19', name: 'Sofia Mendes', email: 'sofia.mendes@preview.local', businessName: 'SM Solutions', avatarUrl: null, progress: 92, points: 1480, streak: 20, joinedAt: '2025-10-15', lastActive: '2026-02-05', status: 'active' },
   { id: 'sb-20', name: 'Thiago Castro', email: 'thiago.castro@preview.local', businessName: 'Castro & Co', avatarUrl: null, progress: 65, points: 850, streak: 6, joinedAt: '2025-12-20', lastActive: '2026-02-05', status: 'active' },
 ];
 
 const SANDBOX_TRAILS = [
   { id: 'trail-1', name: 'Fundamentos de Prospecção', totalLessons: 8 },
   { id: 'trail-2', name: 'Técnicas de Fechamento', totalLessons: 12 },
   { id: 'trail-3', name: 'Objeções e Negociação', totalLessons: 10 },
   { id: 'trail-4', name: 'CRM e Organização', totalLessons: 6 },
 ];
 
 export function useSandboxData() {
   const mentees = useMemo(() => SANDBOX_MENTEES, []);
 
   const ranking = useMemo<SandboxRanking[]>(() => {
     return [...mentees]
       .sort((a, b) => b.points - a.points)
       .map((m, index) => ({
         position: index + 1,
         menteeId: m.id,
         menteeName: m.name,
         points: m.points,
         change: ['up', 'down', 'same'][Math.floor(Math.random() * 3)] as 'up' | 'down' | 'same',
       }));
   }, [mentees]);
 
   const getTrailProgress = (menteeId: string): SandboxTrailProgress[] => {
     const mentee = mentees.find(m => m.id === menteeId);
     if (!mentee) return [];
 
     return SANDBOX_TRAILS.map(trail => ({
       trailId: trail.id,
       trailName: trail.name,
       progress: Math.min(100, Math.max(0, mentee.progress + (Math.random() * 20 - 10))),
       completedLessons: Math.floor(trail.totalLessons * (mentee.progress / 100)),
       totalLessons: trail.totalLessons,
     }));
   };
 
   const stats = useMemo(() => ({
     totalMentees: mentees.length,
     activeMentees: mentees.filter(m => m.status === 'active').length,
     atRiskMentees: mentees.filter(m => m.status === 'at_risk').length,
     inactiveMentees: mentees.filter(m => m.status === 'inactive').length,
     averageProgress: Math.round(mentees.reduce((acc, m) => acc + m.progress, 0) / mentees.length),
     totalPoints: mentees.reduce((acc, m) => acc + m.points, 0),
     topStreak: Math.max(...mentees.map(m => m.streak)),
   }), [mentees]);
 
   return {
     mentees,
     ranking,
     stats,
     getTrailProgress,
     getMentee: (id: string) => mentees.find(m => m.id === id),
   };
 }
 
 export const SANDBOX_TENANT_ID = 'b0000000-0000-0000-0000-000000000002';