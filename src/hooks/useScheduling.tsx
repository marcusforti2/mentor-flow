import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/contexts/TenantContext';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface AvailabilitySlot {
  id: string;
  mentor_membership_id: string;
  tenant_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

export interface SessionBooking {
  id: string;
  mentor_membership_id: string;
  mentee_membership_id: string;
  tenant_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  meeting_url: string | null;
  notes: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
}

const DAY_LABELS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function getDayLabel(day: number) {
  return DAY_LABELS[day] || '';
}

export function useScheduling() {
  const { activeMembership } = useTenant();
  const tenantId = activeMembership?.tenant_id;
  const membershipId = activeMembership?.id;
  const role = activeMembership?.role;
  const queryClient = useQueryClient();

  // Availability (for mentors to manage, mentees to view)
  const availabilityQuery = useQuery({
    queryKey: ['mentor-availability', tenantId],
    queryFn: async (): Promise<AvailabilitySlot[]> => {
      if (!tenantId) throw new Error('No tenant');
      const query = supabase
        .from('mentor_availability')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');

      // If mentor, only show own
      if (role === 'mentor' || role === 'admin') {
        query.eq('mentor_membership_id', membershipId!);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as AvailabilitySlot[];
    },
    enabled: !!tenantId,
  });

  // Bookings
  const bookingsQuery = useQuery({
    queryKey: ['session-bookings', membershipId],
    queryFn: async (): Promise<SessionBooking[]> => {
      if (!membershipId) throw new Error('No membership');

      let query = supabase
        .from('session_bookings')
        .select('*')
        .order('scheduled_at', { ascending: true });

      if (role === 'mentee') {
        query = query.eq('mentee_membership_id', membershipId);
      } else {
        query = query.eq('mentor_membership_id', membershipId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as SessionBooking[];
    },
    enabled: !!membershipId,
  });

  // Realtime for bookings
  useEffect(() => {
    if (!membershipId) return;
    const channel = supabase
      .channel('bookings-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'session_bookings',
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['session-bookings', membershipId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [membershipId, queryClient]);

  // Save availability
  const saveAvailability = useMutation({
    mutationFn: async (slots: Omit<AvailabilitySlot, 'id' | 'created_at'>[]) => {
      if (!membershipId || !tenantId) throw new Error('Missing context');

      // Delete existing
      await supabase
        .from('mentor_availability')
        .delete()
        .eq('mentor_membership_id', membershipId)
        .eq('tenant_id', tenantId);

      if (slots.length === 0) return;

      const { error } = await supabase
        .from('mentor_availability')
        .insert(slots.map(s => ({
          ...s,
          mentor_membership_id: membershipId,
          tenant_id: tenantId,
        })));
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-availability', tenantId] });
      toast.success('Disponibilidade salva!');
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  // Create booking
  const createBooking = useMutation({
    mutationFn: async (booking: {
      mentor_membership_id: string;
      scheduled_at: string;
      duration_minutes: number;
      notes?: string;
      meeting_url?: string;
    }) => {
      if (!membershipId || !tenantId) throw new Error('Missing context');

      const { error } = await supabase
        .from('session_bookings')
        .insert({
          ...booking,
          mentee_membership_id: membershipId,
          tenant_id: tenantId,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-bookings', membershipId] });
      toast.success('Sessão agendada com sucesso!');
    },
    onError: (e: Error) => toast.error(`Erro ao agendar: ${e.message}`),
  });

  // Cancel booking
  const cancelBooking = useMutation({
    mutationFn: async ({ bookingId, reason }: { bookingId: string; reason?: string }) => {
      const { error } = await supabase
        .from('session_bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason || null,
        } as Record<string, unknown>)
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-bookings', membershipId] });
      toast.success('Sessão cancelada.');
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  // Complete booking
  const completeBooking = useMutation({
    mutationFn: async (bookingId: string) => {
      const { error } = await supabase
        .from('session_bookings')
        .update({ status: 'completed' } as Record<string, unknown>)
        .eq('id', bookingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-bookings', membershipId] });
      toast.success('Sessão concluída!');
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });

  return {
    availability: availabilityQuery.data || [],
    isLoadingAvailability: availabilityQuery.isLoading,
    bookings: bookingsQuery.data || [],
    isLoadingBookings: bookingsQuery.isLoading,
    saveAvailability,
    createBooking,
    cancelBooking,
    completeBooking,
    role,
    membershipId,
    tenantId,
  };
}
