# Configuração de autenticação Supabase

Este documento explica como configurar a autenticação Supabase para o projeto da Calculadora de Painel de LED.

## Pré-requisitos

1. Conta Supabase criada em [supabase.com](https://supabase.com)
2. Projeto Supabase criado

## Configuração

### 1. Configurar o arquivo auth-config.js

Edite o arquivo `auth-config.js` e substitua o valor da variável `SUPABASE_KEY` pela chave anon/public do seu projeto Supabase:

```javascript
const SUPABASE_KEY = 'sua-chave-supabase-aqui';  // Substitua pela sua chave anon/public
```

Você pode encontrar esta chave no dashboard do seu projeto Supabase em Configurações do Projeto > API.

### 2. Configurar autenticação no Supabase

1. No dashboard do Supabase, vá para Authentication > Providers
2. Ative o provedor Email/Password
3. Opcional: Configure outros provedores de autenticação (Google, Facebook, etc.) se desejar

### 3. Configurar redirecionamento após confirmação de email

1. No dashboard do Supabase, vá para Authentication > URL Configuration
2. Configure a URL de redirecionamento para o seu site (ex: `https://seu-site.com/onav/led/index.optimized.html`)

## Segurança

Lembre-se que a chave anon/public do Supabase é exposta no cliente (navegador). Isso é normal e seguro desde que você implemente permissões adequadas no Supabase usando Row Level Security (RLS).

### Para configurar Row Level Security:

1. Vá para o banco de dados no dashboard do Supabase
2. Selecione as tabelas que você deseja proteger
3. Vá para "Auth > Policies"
4. Adicione políticas para restringir o acesso aos dados conforme necessário

## Teste

Para testar a autenticação:

1. Abra o arquivo `login.html` em seu navegador
2. Crie uma nova conta de usuário
3. Verifique seu email para confirmar a conta (se a confirmação de email estiver ativada)
4. Faça login com as credenciais criadas

Você deve ser redirecionado para a página principal da calculadora após o login bem-sucedido.

## Solução de Problemas

Se encontrar problemas:

1. Verifique o console do navegador para mensagens de erro
2. Certifique-se de que as chaves do Supabase estão corretas
3. Verifique se as URLs de redirecionamento estão configuradas corretamente no Supabase
4. Certifique-se de que o provedor de autenticação por email está ativado no Supabase
