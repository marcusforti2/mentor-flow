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
 }
 
 serve(async (req) => {
   if (req.method === 'OPTIONS') {
     return new Response('ok', { headers: corsHeaders });
   }
 
   try {
     const { fileContent, fileName } = await req.json();
 
     if (!fileContent) {
       throw new Error('Arquivo não fornecido');
     }
 
     console.log(`Parsing file: ${fileName}`);
 
     // Decode base64 content
     const decodedContent = atob(fileContent);
     
     // Parse CSV content
     const lines = decodedContent.split(/\r?\n/).filter(line => line.trim());
     
     if (lines.length < 2) {
       throw new Error('Arquivo deve ter pelo menos um cabeçalho e uma linha de dados');
     }
 
     // Parse header - handle both comma and semicolon separators
     const separator = lines[0].includes(';') ? ';' : ',';
     const headers = lines[0].split(separator).map(h => h.trim().toLowerCase());
     
     console.log('Headers found:', headers);
 
     // AI-like column mapping - find best match for each required field
     const columnMapping = {
       full_name: findBestMatch(headers, ['nome', 'name', 'nome completo', 'full_name', 'fullname', 'nome_completo']),
       email: findBestMatch(headers, ['email', 'e-mail', 'mail', 'correio', 'email_address']),
       phone: findBestMatch(headers, ['telefone', 'phone', 'celular', 'whatsapp', 'tel', 'fone', 'mobile']),
       business_name: findBestMatch(headers, ['empresa', 'company', 'negocio', 'negócio', 'business', 'razao_social', 'razão social']),
     };
 
     console.log('Column mapping:', columnMapping);
 
     // Validate required mappings
     if (columnMapping.full_name === -1) {
       throw new Error('Não foi possível identificar a coluna de Nome. Certifique-se de ter uma coluna chamada "Nome" ou "Name".');
     }
 
     // Parse data rows
     const parsedData: ParsedRow[] = [];
     const errors: string[] = [];
 
     for (let i = 1; i < lines.length; i++) {
       const values = parseCSVLine(lines[i], separator);
       
       const row: ParsedRow = {
         full_name: values[columnMapping.full_name]?.trim() || '',
         email: columnMapping.email !== -1 ? values[columnMapping.email]?.trim() || '' : '',
         phone: columnMapping.phone !== -1 ? values[columnMapping.phone]?.trim() : undefined,
         business_name: columnMapping.business_name !== -1 ? values[columnMapping.business_name]?.trim() : undefined,
       };
 
       // Validate row
       if (!row.full_name) {
         errors.push(`Linha ${i + 1}: Nome vazio`);
         continue;
       }
 
       // Validate email format if present
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