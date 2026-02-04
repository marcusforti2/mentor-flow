-- Atribuir role de mentorado para Mariana
INSERT INTO user_roles (user_id, role)
VALUES ('1ffe23f6-386e-4e2c-986b-69ce665901fa', 'mentorado')
ON CONFLICT (user_id, role) DO NOTHING;

-- Criar registro de mentorado vinculado ao mentor existente
INSERT INTO mentorados (user_id, mentor_id, status, joined_at)
VALUES (
  '1ffe23f6-386e-4e2c-986b-69ce665901fa',
  'ea66854f-10ce-41c8-9609-b128d5a237f8',
  'active',
  now()
)
ON CONFLICT DO NOTHING;