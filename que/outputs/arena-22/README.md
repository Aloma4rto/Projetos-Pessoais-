# Arena 22

Site estático para a Arena 22, pronto para publicar em Vercel, Cloudflare Pages ou Netlify.

## Agenda de reservas (Supabase)

O site já tem a interface de agenda. Para ela funcionar, crie um projeto gratuito no [Supabase](https://supabase.com), abra o **SQL Editor**, cole todo o arquivo `supabase-schema.sql` e clique em **Run**.

Em seguida, no Supabase, entre em **Project Settings → API** e copie a **Project URL** e a chave **anon public** para `config.js`. A chave `service_role` nunca deve ser copiada para o site.

O banco grava nome, telefone, data, horário, quadra e observações como `pending`. Esse status já bloqueia o horário para novos pedidos. No painel do Supabase, abra a tabela `bookings` para trocar o status para `confirmed` ou `cancelled`; reservas canceladas voltam a ficar disponíveis.

O arquivo SQL expõe publicamente apenas a disponibilidade de cada horário, nunca nome, telefone ou observações dos clientes.

## Antes de publicar

Abra `config.js` e preencha ao menos um dos canais:

```js
window.ARENA_CONFIG = {
  whatsappNumber: "5511999999999", // somente números
  bookingEmail: "reservas@suaarena.com",
  supabaseUrl: "https://seu-projeto.supabase.co",
  supabaseAnonKey: "sua-chave-anon-public",
};
```

Com a URL e chave pública preenchidas, a agenda mostra horários disponíveis e indisponíveis. O pedido é salvo antes de o cliente seguir para WhatsApp ou e-mail. Enquanto um canal estiver vazio, a pré-reserva ainda fica gravada no banco, mas aquele meio de atendimento não é aberto.

## Publicar na Vercel

1. Envie esta pasta para um repositório no GitHub.
2. Entre em [vercel.com](https://vercel.com) com sua conta GitHub.
3. Escolha **Add New → Project**, importe o repositório e confirme o deploy.
4. A Vercel reconhecerá o `index.html` e entregará uma URL gratuita `*.vercel.app`.

Não há build nem dependências: os quatro arquivos da pasta são tudo o que o site precisa.

## Alterações rápidas

- Preços: a seção já usa “Valores sob consulta”; quando os valores estiverem definidos, substitua aquele texto em `index.html`.
- Quadras: os nomes “Quadra 01” e “Quadra 02” podem ser trocados no HTML e no seletor de reserva.
- Mapa: o botão “Abrir no Google Maps” já aponta para o endereço informado.
- Montador de times: digite um jogador por linha e marque goleiros com `(G)`, por exemplo `João (G)`. Sem marcação, o site sorteia um goleiro em cada time.
