# Tela de colaboradores

## Objetivo
Criar uma tela administrativa para acompanhar quem já se cadastrou no aplicativo e copiar o endereço de acesso para cada colaborador.

## Implementação
- Criar uma consulta segura, exclusiva para administradores, que liste as contas cadastradas sem expor dados sensíveis.
- Exibir nome, e-mail, situação da confirmação, último acesso e data de cadastro.
- Usar o nome salvo pela conta Google ou cadastro; quando não existir, mostrar uma identificação derivada do e-mail.
- Adicionar busca, contadores de cadastrados/confirmados/pendentes e atualização manual.
- Incluir em cada linha um botão para copiar o link de entrada do aplicativo e um botão geral para copiar o mesmo link.
- Adicionar um atalho para a nova tela na área de Administração e no cabeçalho do painel para administradores.

## Segurança e validação
- Confirmar a sessão e o papel de administrador no servidor antes de acessar a lista de usuários.
- Manter a tela dentro da área protegida por login.
- Validar compilação e o comportamento da tela em celular e computador.
