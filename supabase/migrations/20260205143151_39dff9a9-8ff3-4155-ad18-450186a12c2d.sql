-- Atualizar trigger para extrair full_name e phone do user_metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (user_id, email, full_name, phone)
    VALUES (
      NEW.id, 
      NEW.email,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'phone'
    );
    RETURN NEW;
END;
$$;