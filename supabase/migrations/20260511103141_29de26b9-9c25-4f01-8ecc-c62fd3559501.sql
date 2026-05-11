
DO $$
DECLARE
  v_keep_user uuid := '535839ef-687b-4ac9-8bbd-4207df212fd7';
BEGIN
  -- Limpa registros sem ON DELETE CASCADE que apontam para memberships a serem removidos
  DELETE FROM public.mentorado_files WHERE uploaded_by_membership_id IN (SELECT id FROM public.memberships WHERE user_id <> v_keep_user);
  DELETE FROM public.mentor_library WHERE membership_id IN (SELECT id FROM public.memberships WHERE user_id <> v_keep_user);
  DELETE FROM public.playbook_access_rules WHERE playbook_id IN (SELECT id FROM public.playbooks WHERE created_by_membership_id IN (SELECT id FROM public.memberships WHERE user_id <> v_keep_user));
  DELETE FROM public.playbooks WHERE created_by_membership_id IN (SELECT id FROM public.memberships WHERE user_id <> v_keep_user);
  DELETE FROM public.playbook_folders WHERE created_by_membership_id IN (SELECT id FROM public.memberships WHERE user_id <> v_keep_user);
  DELETE FROM public.popup_dismissals WHERE membership_id IN (SELECT id FROM public.memberships WHERE user_id <> v_keep_user);
  DELETE FROM public.tenant_popups WHERE created_by IN (SELECT id FROM public.memberships WHERE user_id <> v_keep_user);
  DELETE FROM public.whatsapp_message_logs WHERE recipient_membership_id IN (SELECT id FROM public.memberships WHERE user_id <> v_keep_user);
  DELETE FROM public.whatsapp_campaigns WHERE owner_membership_id IN (SELECT id FROM public.memberships WHERE user_id <> v_keep_user);
  DELETE FROM public.whatsapp_automation_flows WHERE owner_membership_id IN (SELECT id FROM public.memberships WHERE user_id <> v_keep_user);
  DELETE FROM public.whatsapp_incoming_messages WHERE matched_membership_id IN (SELECT id FROM public.memberships WHERE user_id <> v_keep_user);

  -- Limpezas auxiliares
  DELETE FROM public.invites;
  DELETE FROM public.otp_codes;
  DELETE FROM public.otp_rate_limits;
  DELETE FROM public.impersonation_logs;

  -- Apaga usuários (cascade limpa profiles, memberships e dependentes com CASCADE)
  DELETE FROM auth.users WHERE id <> v_keep_user;

  -- Garantia: remove órfãos
  DELETE FROM public.memberships WHERE user_id <> v_keep_user;
  DELETE FROM public.profiles WHERE user_id <> v_keep_user;
END $$;
