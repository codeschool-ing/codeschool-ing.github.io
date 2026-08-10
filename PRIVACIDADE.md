# Política de Privacidade — codeschool.ing

> **Rascunho.** Redigido a partir do que o sistema hoje coleta e processa, para
> servir de base. **Não é aconselhamento jurídico** — revise com um(a)
> advogado(a) antes de publicar e preencha os campos entre `[colchetes]`.
> Vigência a partir de `[data]`.

## 1. Quem é o controlador

`[Razão social / nome empresarial]`, inscrita no CNPJ `[nº]`, com sede em
`[endereço]` ("codeschool.ing", "nós"), é a controladora dos dados pessoais
tratados no site `codeschool.ing` e no portal do aluno.

## 2. Encarregado(a) pelo tratamento (DPO)

`[Nome do(a) encarregado(a)]` — `[privacidade@codeschool.ing]`. É por esse canal
que você exerce seus direitos e tira dúvidas sobre esta política.

## 3. Quais dados tratamos

### No portal do aluno (quando você cria uma conta)

- **Cadastro:** nome, e-mail e senha. A senha é guardada apenas como um *hash*
  (Argon2id) — não armazenamos, nem conseguimos ler, a sua senha.
- **Aprendizado:** progresso (aulas e seções concluídas), as anotações que você
  escreve, o ponto de onde retomar, resultados de provas e certificados emitidos
  (que registram o seu nome, o curso, a data e um código de validação).
- **Autenticação e segurança:** metadados das suas sessões — endereço IP e
  navegador (*user-agent*), para você reconhecer os próprios acessos — e, se você
  ativar a verificação em dois fatores, um segredo **cifrado** do seu aplicativo
  autenticador e os *hashes* dos códigos de recuperação.
- **Mensagens transacionais:** para confirmar o seu e-mail, confirmar a troca de
  e-mail e redefinir a senha.

### Na vitrine (site público)

- **Formulário de contato/inscrição:** o seu nome, um contato (e-mail ou
  telefone) e o plano de interesse, quando você pede para falar com a gente.
- **Newsletter:** o seu e-mail, se você se inscreve para receber novidades.

### Cookies e armazenamento local

- **Cookie de sessão** (`portal_session`): mantém você conectado(a) no portal. É
  essencial ao funcionamento e não serve a rastreamento.
- **Cookie de verificação:** de curta duração, apenas durante um login em dois
  passos.
- **Armazenamento local do navegador:** a sua preferência de idioma e de tema e,
  antes de você entrar, o seu progresso de estudo local — que é enviado para a
  sua conta no primeiro login.

Não usamos cookies de publicidade, rastreadores de terceiros nem ferramentas
de analytics.

## 4. Para que usamos, e com que base legal (LGPD, art. 7)

| Finalidade | Base legal |
|---|---|
| Criar e manter a sua conta e prestar o serviço de ensino | Execução de contrato (art. 7, V) |
| Autenticar acessos e proteger contas — limite de tentativas, verificação em dois fatores, registro de sessões | Execução de contrato e legítimo interesse (art. 7, V e IX) |
| Enviar mensagens de confirmação e de redefinição de senha | Execução de contrato (art. 7, V) |
| Emitir e validar certificados | Execução de contrato (art. 7, V) |
| Formulário de contato/inscrição e newsletter na vitrine | Consentimento (art. 7, I) |
| Cumprir obrigações legais e regulatórias | Obrigação legal (art. 7, II) |

`[Revisar as bases legais com assessoria jurídica — em especial o legítimo
interesse, que exige um teste de proporcionalidade documentado.]`

## 5. Com quem compartilhamos

Não vendemos os seus dados. Compartilhamos com operadores que nos ajudam a
prestar o serviço, apenas no necessário:

- **Hospedagem e banco de dados:** Google Cloud (Cloud Run e Cloud SQL), com
  dados em repouso na região **us-central1 (Iowa, Estados Unidos)**.
- **Site estático:** GitHub Pages (serve a vitrine e o portal).
- **Envio de e-mails:** Brevo (Sendinblue), que entrega as mensagens
  transacionais — confirmação de e-mail e redefinição de senha.
- **Formulários da vitrine:** ainda em modo demonstração; os formulários de
  contato e de newsletter não enviam dados a provedor nenhum enquanto não são
  configurados. `[Preencher o provedor quando os formulários entrarem no ar.]`

## 6. Transferência internacional

Parte do tratamento ocorre fora do Brasil: os dados do portal ficam hospedados
nos **Estados Unidos** (Google Cloud, região us-central1) e o envio de e-mails
passa pela **Brevo**, com operação na União Europeia. Nesses casos, a
transferência se apoia nas garantias compatíveis com a LGPD (art. 33) oferecidas
por esses provedores. `[Confirmar e documentar a base de cada transferência —
cláusulas-padrão contratuais, decisão de adequação, etc.]`

## 7. Por quanto tempo guardamos

Guardamos os seus dados enquanto a sua conta existir e pelo tempo necessário às
finalidades acima. Ao encerrar a conta, eliminamos ou anonimizamos os dados,
ressalvado o que a lei exigir manter — por exemplo, `[registros de acesso a
aplicações por 6 meses, conforme o art. 15 do Marco Civil da Internet]`.
`[Definir os prazos de retenção específicos.]`

## 8. Como protegemos

Senhas com Argon2id; o segredo da verificação em dois fatores cifrado em
repouso; conexões por HTTPS; cookies `HttpOnly`, `Secure` e `SameSite`; limite
de tentativas nas rotas de login e de recuperação; e o princípio do menor
privilégio no acesso à infraestrutura. Nenhuma medida elimina todo risco, mas
trabalhamos continuamente para reduzi-lo.

## 9. Os seus direitos (LGPD, art. 18)

Você pode, a qualquer tempo: **confirmar** se tratamos os seus dados e
**acessá-los**; **corrigir** dados incompletos ou desatualizados; pedir
**anonimização, bloqueio ou eliminação** de dados desnecessários ou tratados em
desconformidade; pedir **portabilidade**; pedir a **eliminação** dos dados
tratados com base no seu consentimento; **saber com quem** compartilhamos; e
**revogar o consentimento**. Boa parte disso você já faz na própria tela de
conta — trocar o e-mail e a senha, e apagar o seu progresso. Para o restante,
fale com o(a) encarregado(a) em `[privacidade@codeschool.ing]`; respondemos em
`[prazo, ex.: até 15 dias]`.

## 10. Menores de idade

`[DECISÃO NECESSÁRIA.]` Escolha uma das direções e descreva-a aqui:

- **Se o serviço não se destina a menores:** "O portal é destinado a maiores de
  18 anos; não coletamos intencionalmente dados de crianças e adolescentes."
- **Se aceita menores:** descrever o consentimento específico de um dos pais ou
  responsável para crianças (menores de 12) e o cuidado reforçado com
  adolescentes, conforme o art. 14 da LGPD.

## 11. Alterações nesta política

Podemos atualizar esta política; mudanças relevantes serão avisadas `[no site /
por e-mail]`, com uma nova data de vigência.

## 12. Contato

`[Razão social]` — `[endereço]` — `[privacidade@codeschool.ing]`.

---

<!--
NOTA PARA QUEM VAI FINALIZAR (não faz parte da política):

Este rascunho descreve o tratamento REAL de hoje, lido do código:
  • Portal: conta (nome, e-mail, senha Argon2id), progresso, anotações,
    provas, certificados, metadados de sessão (IP/UA), 2FA (segredo cifrado
    + hashes de códigos de recuperação), e-mails transacionais.
  • Vitrine: formulário de contato (nome + contato + plano → provedor externo)
    e newsletter (e-mail → provedor externo); ambos em "modo demonstração" até
    as URLs serem configuradas em assets/script.js (ENROL_URL / NEWSLETTER_URL).
  • Cookies: portal_session; cookie curto de desafio no 2FA. localStorage:
    codeschool-language, codeschool-theme e o progresso local pré-login.

Já preenchido a partir do que está no ar hoje:
  • Hospedagem em us-central1 (Iowa, EUA) e SMTP pela Brevo — o que torna a
    transferência internacional (§6) um ponto real, não hipotético.
  • Ausência de analytics/rastreadores confirmada.

Pendências que só você/assessoria resolvem (os [colchetes] acima):
  • Controlador (razão social, CNPJ, endereço) e encarregado(a)/DPO + canal.
  • Provedor de formulário/newsletter (só quando saírem do modo demonstração) e
    a base documental de cada transferência internacional.
  • Prazos de retenção e o item de menores de idade; data de vigência.
  • Traduzir para os outros idiomas do site, se a política for exibida neles.

A versão publicada é privacidade.html (mesmo conteúdo, estilizada); mantenha os
dois em sincronia, como style.css e o base.css do portal.
-->
