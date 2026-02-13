import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParsedRow {
  full_name: string;
  email: string;
  phone?: string;
  business_name?: string;
  joined_at?: string;
  instagram?: string;
  linkedin?: string;
  website?: string;
  notes?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { error: authError } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
    if (authError) {
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { fileContent, fileName } = await req.json();

    if (!fileContent) {
      throw new Error('Arquivo não fornecido');
    }

    console.log(`Parsing file: ${fileName}`);

    const decodedContent = atob(fileContent);
    const lines = decodedContent.split(/\r?\n/).filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('Arquivo deve ter pelo menos um cabeçalho e uma linha de dados');
    }

    const separator = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
    
    console.log('Headers found:', headers);

    const columnMapping = {
      full_name: findBestMatch(headers, ['nome', 'name', 'nome completo', 'full_name', 'fullname', 'nome_completo']),
      email: findBestMatch(headers, ['email', 'e-mail', 'mail', 'correio', 'email_address']),
      phone: findBestMatch(headers, ['telefone', 'phone', 'celular', 'whatsapp', 'tel', 'fone', 'mobile']),
      business_name: findBestMatch(headers, ['empresa', 'company', 'negocio', 'negócio', 'business', 'razao_social', 'razão social']),
      joined_at: findBestMatch(headers, ['data_entrada', 'data entrada', 'data de entrada', 'data inicio', 'data de inicio', 'data início', 'joined_at', 'joined', 'data', 'date', 'entrada', 'inicio', 'início']),
      instagram: findBestMatch(headers, ['instagram', 'insta', '@instagram', 'ig']),
      linkedin: findBestMatch(headers, ['linkedin', 'linked_in', 'linked in']),
      website: findBestMatch(headers, ['site', 'website', 'portfolio', 'portfólio', 'url', 'link']),
      notes: findBestMatch(headers, ['observacao', 'observação', 'observacoes', 'observações', 'notas', 'obs', 'notes', 'nota', 'comentario', 'comentário']),
    };

    console.log('Column mapping:', columnMapping);

    if (columnMapping.full_name === -1) {
      throw new Error('Não foi possível identificar a coluna de Nome. Certifique-se de ter uma coluna chamada "Nome" ou "Name".');
    }

    const parsedData: ParsedRow[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i], separator);
      
      const row: ParsedRow = {
        full_name: values[columnMapping.full_name]?.trim() || '',
        email: columnMapping.email !== -1 ? values[columnMapping.email]?.trim() || '' : '',
        phone: columnMapping.phone !== -1 ? values[columnMapping.phone]?.trim() : undefined,
        business_name: columnMapping.business_name !== -1 ? values[columnMapping.business_name]?.trim() : undefined,
        joined_at: columnMapping.joined_at !== -1 ? parseDate(values[columnMapping.joined_at]?.trim()) : undefined,
        instagram: columnMapping.instagram !== -1 ? values[columnMapping.instagram]?.trim() : undefined,
        linkedin: columnMapping.linkedin !== -1 ? values[columnMapping.linkedin]?.trim() : undefined,
        website: columnMapping.website !== -1 ? values[columnMapping.website]?.trim() : undefined,
        notes: columnMapping.notes !== -1 ? values[columnMapping.notes]?.trim() : undefined,
      };

      if (!row.full_name) {
        errors.push(`Linha ${i + 1}: Nome vazio`);
        continue;
      }

      if (row.email && !isValidEmail(row.email)) {
        errors.push(`Linha ${i + 1}: Email inválido (${row.email})`);
      }

      parsedData.push(row);
    }

    console.log(`Parsed ${parsedData.length} rows with ${errors.length} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        data: parsedData,
        mapping: {
          full_name: columnMapping.full_name !== -1 ? headers[columnMapping.full_name] : null,
          email: columnMapping.email !== -1 ? headers[columnMapping.email] : null,
          phone: columnMapping.phone !== -1 ? headers[columnMapping.phone] : null,
          business_name: columnMapping.business_name !== -1 ? headers[columnMapping.business_name] : null,
          joined_at: columnMapping.joined_at !== -1 ? headers[columnMapping.joined_at] : null,
          instagram: columnMapping.instagram !== -1 ? headers[columnMapping.instagram] : null,
          linkedin: columnMapping.linkedin !== -1 ? headers[columnMapping.linkedin] : null,
          website: columnMapping.website !== -1 ? headers[columnMapping.website] : null,
          notes: columnMapping.notes !== -1 ? headers[columnMapping.notes] : null,
        },
        headers,
        errors,
        totalRows: lines.length - 1,
        validRows: parsedData.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error parsing spreadsheet:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function findBestMatch(headers: string[], patterns: string[]): number {
  for (const pattern of patterns) {
    const index = headers.findIndex(h => 
      h === pattern || 
      h.includes(pattern) || 
      pattern.includes(h)
    );
    if (index !== -1) return index;
  }
  return -1;
}

function parseCSVLine(line: string, separator: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === separator && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map(v => v.replace(/^"|"$/g, ''));
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function parseDate(value: string | undefined): string | undefined {
  if (!value) return undefined;
  
  // Try DD/MM/YYYY or DD-MM-YYYY
  const brMatch = value.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (brMatch) {
    const [, day, month, year] = brMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  
  // Try YYYY-MM-DD
  const isoMatch = value.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    const date = new Date(value);
    if (!isNaN(date.getTime())) return date.toISOString();
  }
  
  // Try generic Date parse
  const date = new Date(value);
  if (!isNaN(date.getTime())) return date.toISOString();
  
  return undefined;
}
