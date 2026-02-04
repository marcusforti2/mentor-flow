-- Atualizar a role do usuário master (marcusforti2@gmail.com)
UPDATE public.user_roles 
SET role = 'admin_master' 
WHERE user_id = '178685ca-85bb-49ed-b5d2-72a7ada8bedb';