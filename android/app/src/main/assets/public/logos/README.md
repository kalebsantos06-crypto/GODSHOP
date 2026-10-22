# Pasta de Logos do GODSHOP (Compilação & Produção)

Esta pasta foi criada para você armazenar e gerenciar facilmente os logotipos e ícones do aplicativo para quando for compilar para **Android APK (Capacitor)** ou publicar no **Cloudflare Pages / Vercel**.

---

### Estrutura dos Arquivos:

- **`logo.png`**:
  Logotipo principal do sistema (exibido na tela de login, cabeçalho, notas de garantia e recibos).
  *Recomendado: Formato PNG transparente.*

- **`icon.png`**:
  Ícone do aplicativo (utilizado para gerar o ícone do APK Android e atalhos na tela de início).
  *Recomendado: Formato PNG quadrado (512x512 ou 192x192).*

- **`background.jpg`**:
  (Opcional) Imagem de plano de fundo da loja.

---

### Como Funciona:
Ao executar `npm run build`, tudo o que estiver colocado nesta pasta `public/logos/` é copiado e embutido automaticamente dentro de `dist/logos/` e fica disponível no seu APK compilado e no Cloudflare sob o caminho:
`/logos/logo.png` e `/logos/icon.png`.
