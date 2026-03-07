export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Termos de Serviço</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 07 de março de 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground [&_h2]:text-foreground [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_strong]:text-foreground">

          <p>Bem-vindo à <strong>MentorFlow</strong>. Ao acessar ou utilizar a plataforma disponível em <strong>bymentorflow.com.br</strong>, você concorda com os presentes Termos de Serviço. Leia-os atentamente.</p>

          <h2>1. Definições</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Plataforma:</strong> o sistema web MentorFlow, incluindo todas as funcionalidades, ferramentas de IA, integrações e serviços associados.</li>
            <li><strong>Usuário:</strong> qualquer pessoa que acesse ou utilize a plataforma, seja como mentor, mentorado, administrador ou operador.</li>
            <li><strong>Tenant:</strong> ambiente isolado dentro da plataforma, pertencente a um mentor ou empresa de mentoria.</li>
            <li><strong>Conteúdo:</strong> qualquer dado, texto, imagem, arquivo ou material enviado ou gerado na plataforma.</li>
          </ul>

          <h2>2. Aceitação dos Termos</h2>
          <p>Ao criar uma conta ou utilizar a plataforma, você declara que leu, entendeu e concordou com estes Termos. Se você não concorda, não utilize a plataforma.</p>

          <h2>3. Cadastro e Conta</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Você deve fornecer informações verdadeiras e mantê-las atualizadas.</li>
            <li>Você é responsável por manter a confidencialidade de suas credenciais de acesso.</li>
            <li>Cada conta é pessoal e intransferível.</li>
            <li>Menores de 18 anos devem ter autorização de um responsável legal.</li>
          </ul>

          <h2>4. Uso da Plataforma</h2>
          <p>Você se compromete a:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Utilizar a plataforma apenas para fins legítimos relacionados a mentoria e desenvolvimento profissional.</li>
            <li>Não enviar conteúdo ilegal, ofensivo, difamatório ou que viole direitos de terceiros.</li>
            <li>Não tentar acessar contas, dados ou funcionalidades de outros usuários sem autorização.</li>
            <li>Não realizar engenharia reversa, scraping ou ataques à infraestrutura da plataforma.</li>
          </ul>

          <h2>5. Ferramentas de Inteligência Artificial</h2>
          <p>A plataforma oferece ferramentas de IA para geração de conteúdo, análises e recomendações. Os resultados gerados por IA são sugestões e não substituem o julgamento profissional. A MentorFlow não se responsabiliza por decisões tomadas exclusivamente com base em outputs de IA.</p>

          <h2>6. Propriedade Intelectual</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>A plataforma, seu design, código e funcionalidades são propriedade da MentorFlow.</li>
            <li>Conteúdo criado por mentores (playbooks, trilhas, materiais) permanece de propriedade do respectivo autor.</li>
            <li>Ao publicar conteúdo na plataforma, você concede à MentorFlow uma licença não exclusiva para exibi-lo e distribuí-lo dentro do contexto do tenant.</li>
          </ul>

          <h2>7. Integrações com Terceiros</h2>
          <p>A plataforma pode se integrar com serviços de terceiros (Google Calendar, Google Drive, etc.). O uso dessas integrações está sujeito aos termos de serviço dos respectivos provedores. A MentorFlow não se responsabiliza por indisponibilidade ou alterações nesses serviços.</p>

          <h2>8. Disponibilidade e Suporte</h2>
          <p>Nos empenhamos para manter a plataforma disponível 24/7, mas não garantimos disponibilidade ininterrupta. Manutenções programadas serão comunicadas com antecedência quando possível.</p>

          <h2>9. Limitação de Responsabilidade</h2>
          <p>A MentorFlow não se responsabiliza por:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Danos indiretos, incidentais ou consequenciais decorrentes do uso da plataforma.</li>
            <li>Perda de dados causada por fatores fora do nosso controle.</li>
            <li>Conteúdo gerado ou publicado por outros usuários.</li>
            <li>Resultados obtidos com base em ferramentas de IA ou análises da plataforma.</li>
          </ul>

          <h2>10. Suspensão e Encerramento</h2>
          <p>Reservamo-nos o direito de suspender ou encerrar contas que violem estes Termos, sem aviso prévio. O usuário pode encerrar sua conta a qualquer momento entrando em contato com o suporte.</p>

          <h2>11. Alterações nos Termos</h2>
          <p>Podemos modificar estes Termos a qualquer momento. Alterações significativas serão comunicadas por e-mail ou aviso na plataforma. O uso continuado da plataforma após as alterações constitui aceitação dos novos termos.</p>

          <h2>12. Legislação Aplicável</h2>
          <p>Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será submetida ao foro da comarca de domicílio do usuário.</p>

          <h2>13. Contato</h2>
          <p>Para dúvidas sobre estes Termos:</p>
          <ul className="list-none space-y-1">
            <li>📧 <strong>contato@bymentorflow.com.br</strong></li>
            <li>🌐 <strong>bymentorflow.com.br</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
