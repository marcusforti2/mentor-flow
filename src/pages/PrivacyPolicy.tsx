export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: 07 de março de 2026</p>

        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground [&_h2]:text-foreground [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3 [&_strong]:text-foreground">

          <p>A <strong>MentorFlow</strong> ("nós", "nosso" ou "plataforma"), acessível em <strong>bymentorflow.com.br</strong>, valoriza a privacidade dos seus usuários. Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações pessoais.</p>

          <h2>1. Informações que Coletamos</h2>
          <p>Coletamos as seguintes categorias de dados:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Dados de cadastro:</strong> nome, e-mail, telefone, empresa, cargo e foto de perfil.</li>
            <li><strong>Dados de uso:</strong> páginas visitadas, funcionalidades utilizadas, métricas de engajamento e progresso em trilhas.</li>
            <li><strong>Dados de integração:</strong> quando você conecta serviços de terceiros (ex: Google Calendar, Google Drive), acessamos informações conforme os escopos autorizados por você.</li>
            <li><strong>Dados de comunicação:</strong> mensagens enviadas na comunidade, respostas a formulários e interações com ferramentas de IA.</li>
            <li><strong>Dados técnicos:</strong> endereço IP, tipo de navegador, sistema operacional e identificadores de dispositivo.</li>
          </ul>

          <h2>2. Como Usamos suas Informações</h2>
          <ul className="list-disc pl-6 space-y-1">
            <li>Fornecer, operar e melhorar a plataforma.</li>
            <li>Personalizar sua experiência de mentoria e aprendizado.</li>
            <li>Enviar notificações, lembretes de eventos e comunicações relevantes.</li>
            <li>Gerar relatórios e análises para mentores e administradores do tenant.</li>
            <li>Processar dados com ferramentas de Inteligência Artificial para gerar insights, pontuações e recomendações.</li>
            <li>Cumprir obrigações legais e regulatórias.</li>
          </ul>

          <h2>3. Compartilhamento de Dados</h2>
          <p>Não vendemos seus dados pessoais. Podemos compartilhar informações com:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li><strong>Mentores e administradores</strong> do seu tenant, para acompanhamento de progresso e gestão.</li>
            <li><strong>Prestadores de serviço</strong> que nos auxiliam na operação da plataforma (hospedagem, e-mail, analytics), sob contratos de confidencialidade.</li>
            <li><strong>Autoridades legais</strong>, quando exigido por lei ou ordem judicial.</li>
          </ul>

          <h2>4. Integrações com Google</h2>
          <p>Quando você conecta sua conta Google, a MentorFlow acessa apenas os escopos explicitamente autorizados por você durante o fluxo de autorização OAuth. Os tokens de acesso são armazenados de forma criptografada e isolada por usuário. Você pode revogar o acesso a qualquer momento pelo painel de conexões ou pelas configurações da sua conta Google.</p>
          <p>O uso de dados recebidos das APIs do Google está em conformidade com a <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Política de Dados de Usuário dos Serviços de API do Google</a>, incluindo os requisitos de Uso Limitado.</p>

          <h2>5. Armazenamento e Segurança</h2>
          <p>Seus dados são armazenados em servidores seguros com criptografia em trânsito (TLS) e em repouso. Implementamos controles de acesso baseados em funções (RBAC), políticas de segurança em nível de linha (RLS) e monitoramento contínuo para proteger suas informações.</p>

          <h2>6. Retenção de Dados</h2>
          <p>Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para prestar nossos serviços. Após a exclusão da conta, seus dados pessoais serão removidos em até 30 dias, exceto quando a retenção for exigida por lei.</p>

          <h2>7. Seus Direitos (LGPD)</h2>
          <p>Conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018), você tem direito a:</p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Confirmar a existência de tratamento de dados.</li>
            <li>Acessar, corrigir ou excluir seus dados pessoais.</li>
            <li>Solicitar a portabilidade dos dados.</li>
            <li>Revogar consentimento a qualquer momento.</li>
            <li>Solicitar informações sobre compartilhamento com terceiros.</li>
          </ul>
          <p>Para exercer seus direitos, entre em contato pelo e-mail: <strong>privacidade@bymentorflow.com.br</strong></p>

          <h2>8. Cookies</h2>
          <p>Utilizamos cookies essenciais para autenticação e funcionamento da plataforma. Não utilizamos cookies de rastreamento publicitário.</p>

          <h2>9. Alterações nesta Política</h2>
          <p>Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos você sobre mudanças significativas por e-mail ou aviso na plataforma.</p>

          <h2>10. Contato</h2>
          <p>Se você tiver dúvidas sobre esta política, entre em contato:</p>
          <ul className="list-none space-y-1">
            <li>📧 <strong>privacidade@bymentorflow.com.br</strong></li>
            <li>🌐 <strong>bymentorflow.com.br</strong></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
