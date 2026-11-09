# GODSHOP — Sistema de Gestão Comercial e Catálogo Multissegmento (Arquitetura Universal)

Sistema de alta performance para gestão comercial, controle de estoque multissegmento (smartphones, games, acessórios, informática e eletrônicos), vendas, orçamentos, carnês, notas fiscais, termos de garantia e sincronização bidirecional em tempo real para **Web**, **Android (APK)** e **Windows (EXE)**.

---

## 🚀 Tecnologias

- **Frontend Web & Desktop:** React 19, TypeScript, Vite, Tailwind CSS
- **Bridge Mobile Nativo:** Capacitor 8 (Android)
- **Bridge Desktop Nativo:** Electron 45 (`contextIsolation: true`, `nodeIntegration: false`)
- **Empacotador Windows:** `electron-builder` (Instalador NSIS `.exe` e executável Portable)
- **Persistência & Realtime:** Supabase (PostgreSQL, Storage e WebSocket Realtime) com motor duplo de sincronização offline (`IndexedDB` + `localStorage` fallback)
- **Backend / API:** Node.js, Express, `tsx`

---

## 📁 Estrutura do Projeto

```
GODSHOP/
├── assets/                       # Recursos visuais mestres (logos, banners, produtos)
├── public/                       # Arquivos estáticos web (favicon.ico, manifest.json)
├── electron/                     # Processo principal e preload bridge Electron
│   ├── main.ts                   # Processo principal do Electron (Janelas, IPC Nativos)
│   └── preload.ts                # Ponte IPC segura via contextBridge (window.electronAPI)
├── src/                          # Código-fonte da aplicação React + TypeScript
│   ├── components/               # Componentes de UI reutilizáveis
│   ├── layouts/                  # Layouts mestres (Sidebar, Topbar, Content)
│   ├── pages/                    # Páginas da aplicação (Dashboard, Vendas, Estoque, etc.)
│   ├── services/                 # Serviços de banco de dados, realtime e syncQueue
│   │   ├── db.ts                 # Operações de banco de dados e sanitização
│   │   ├── syncQueue.ts          # Fila offline em IndexedDB/localStorage e fusão de dados
│   │   └── realtime.ts           # Assinatura WebSocket Supabase Realtime
│   ├── integrations/             # Bridge universal de plataforma (Web, Android, Windows)
│   │   └── platform/             # Detecção nativa e APIs unificadas
│   ├── lib/                      # Cliente Supabase e utilitários
│   └── types/                    # Tipos e interfaces TypeScript
├── android/                      # Projeto nativo Android (Gradle Wrapper completo)
│   ├── app/                      # Módulo Android (Manifest, ícones, splash screen)
│   ├── gradle/wrapper/           # Gradle Wrapper para compilação sem Android Studio
│   ├── gradlew                   # Executável Gradle para Linux / macOS
│   └── gradlew.bat               # Executável Gradle para Windows
├── dist/                         # Artefato compilado da aplicação Web / Vite
├── dist-electron/                # Scripts compilados do Electron (main.js, preload.js)
├── dist-electron-build/          # Executáveis finais do Windows (.exe NSIS / Portable)
├── capacitor.config.ts           # Configuração mestre do Capacitor (App ID: com.godshop.app)
├── package.json                  # Scripts de automação e dependências
├── tsconfig.json                 # Configuração do compilador TypeScript
└── README.md                     # Documentação oficial do sistema
```

---

## 💻 1. Execução e Compilação Desktop Windows (Electron)

### Pré-requisitos Windows:
- Node.js 18+ ou 20+
- npm

### Passos para compilação no Windows:

```cmd
# 1. Instalar dependências
npm install

# 2. Testar em modo desenvolvimento desktop
npm run electron:dev

# 3. Compilar os instaladores Windows (.exe)
npm run electron:build
```

#### Artefatos Gerados na pasta `dist-electron-build/`:
- **Instalador NSIS (.exe)**: `GODSHOP Pro Setup 0.0.0.exe` (Instalador completo com atalho na Área de Trabalho e Menu Iniciar).
- **Executável Portable (.exe)**: `GODSHOP Pro 0.0.0.exe` (Executável direto que roda sem necessidade de instalação).

---

## 📱 2. Execução e Compilação Android (Capacitor & Gradle)

### Parâmetros de Identificação:
- **App ID:** `com.godshop.app`
- **App Name:** `Godshop`
- **Web Directory:** `dist`
- **Target SDK:** 36 (Android 13, 14, 15+)
- **Min SDK:** 24 (Android 7.0+)

### Passos para compilação Android no Windows:

```cmd
# 1. Compilar os ativos web e sincronizar com o projeto Android
npm run build:android

# 2. Entrar na pasta do projeto Android
cd android

# 3. Compilar APK Debug (via linha de comando sem abrir Android Studio)
gradlew.bat assembleDebug
```
*O APK de Debug será gerado em: `android/app/build/outputs/apk/debug/app-debug.apk`*

```cmd
# 4. Compilar APK Release
gradlew.bat assembleRelease
```
*O APK de Release será gerado em: `android/app/build/outputs/apk/release/app-release-unsigned.apk`*

### 5. Configurar Assinatura Release (.jks)
Para assinar o APK com sua chave `.jks` no Gradle, configure as variáveis no arquivo `android/gradle.properties`:
```properties
GODSHOP_RELEASE_STORE_FILE=C:\\Caminho\\Para\\godshop-release.jks
GODSHOP_RELEASE_STORE_PASSWORD=sua-senha-keystore
GODSHOP_RELEASE_KEY_ALIAS=seu-alias
GODSHOP_RELEASE_KEY_PASSWORD=sua-senha-alias
```

---

## 🌐 3. Execução Web

```bash
# Executar servidor local de desenvolvimento
npm run dev

# Compilar para produção Web
npm run build:web
```

---

## 🔒 4. Segurança, Persistência e Sincronização

- **Supabase Realtime + Multi-Device:** O aplicativo conecta-se à instância central do Supabase (`https://wkkjaakydjnfzayyedxy.supabase.co`).
- **Fila Offline Resiliente:** Operações realizadas offline são salvas em **IndexedDB** (`godshop_offline_db`) e reenviadas com garantia de idempotência (`upsert` por UUID) e fusão atômica de parcelas financeiras.
- **Segurança:** Apenas chaves anon públicas do cliente estão presentes em `.env.production`. Nenhuma chave privada `service_role` ou senha de certificado é exposta no código.
