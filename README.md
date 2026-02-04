# 🧠 Reframe

> Aplicativo de Registro de Pensamentos Automáticos baseado em TCC (Terapia Cognitivo-Comportamental).

O **Reframe** é uma aplicação móvel desenvolvida para auxiliar pacientes e psicólogos no acompanhamento terapêutico. O
app permite que pacientes registrem seus pensamentos automáticos, emoções e comportamentos, facilitando o processo de
reestruturação cognitiva.

A aplicação foi construída com uma arquitetura **Offline-First**, garantindo que o usuário possa registrar seus momentos
mesmo sem conexão com a internet, sincronizando os dados automaticamente quando a conexão for restabelecida.

---

## 📱 Download (Versão 1.1.0)

Você pode baixar a versão mais recente do aplicativo para Android através do link abaixo:

[![Download APK](https://img.shields.io/badge/Android-Download%20APK%20(v1.1.0)-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://expo.dev/artifacts/eas/6DwzndkegrPex8miUWuoC1.apk)

**Link direto:
** [https://expo.dev/artifacts/eas/6DwzndkegrPex8miUWuoC1.apk](https://expo.dev/artifacts/eas/6DwzndkegrPex8miUWuoC1.apk)

---

## ✨ Funcionalidades

* **Registro de Pensamentos:** Interface intuitiva para registrar Situação, Pensamento Automático, Emoção, Comportamento
  e Evidências.
* **Modo Offline:** Funcionalidade completa sem internet. Os dados são salvos localmente e sincronizados posteriormente.
* **Sincronização Inteligente:** Sistema de *sync* robusto que gerencia dados criados ou excluídos enquanto o
  dispositivo estava offline.
* **Exclusão Segura (Soft Delete):** Permite excluir registros mantendo a integridade dos dados e garantindo a
  sincronização correta entre dispositivos.
* **Perfis de Usuário:** Suporte para Pacientes (registro) e Psicólogos (visualização e acompanhamento).

## 🛠️ Tecnologias Utilizadas

### Mobile (Frontend)

* **React Native** com **Expo**
* **TypeScript**
* **Expo Router** (Navegação baseada em arquivos)
* **Expo SQLite** (Banco de dados local)
* **React Native Reanimated** (Animações fluidas)

### Backend (API)

* **.NET 8** (C#)
* **Entity Framework Core**
* **PostgreSQL** (Banco de dados principal)
* **JWT** (Autenticação segura)

---

## 🔄 Arquitetura de Sincronização

O app utiliza uma estratégia de **Sincronização Bidirecional** customizada:

1. **Leitura:** A UI sempre lê dados do **SQLite local** para garantir performance instantânea.
2. **Escrita:** Novas criações ou exclusões são aplicadas imediatamente no SQLite e marcadas como `synced = 0`.
3. **Sync Background:** Um *hook* monitora a conexão de internet:
    * Envia registros pendentes (`POST` para criação, `DELETE` lógico para exclusão).
    * Baixa atualizações do servidor e faz um *Upsert* no banco local.
4. **Conflitos:** O servidor atua como a fonte da verdade, mas o app prioriza a experiência do usuário permitindo
   edições offline.

---

## 🚀 Como rodar o projeto localmente

### Pré-requisitos

* Node.js e npm/yarn
* .NET SDK (para o backend)
* PostgreSQL

### Passos

1. **Clone o repositório**
   ```bash
   git clone https://github.com/GlauberAndreiOS/reframe
   cd reframe
   ```

2. **Instale as dependências do Mobile**
   ```bash
   cd Views/Application
   npm install
   ```

3. **Inicie o Metro Bundler**
   ```bash
   npx expo start
   ```

4. **Backend (Em outro terminal)**
   ```bash
   cd ../../
   dotnet run
   ```

---

## 📝 Changelog

### v1.1.0

* ✅ **Feature:** Adicionado botão de exclusão na lista de pensamentos.
* ✅ **Feature:** Implementação de *Soft Delete* (exclusão lógica) no App e na API.
* ✅ **Fix:** Correção de bugs na sincronização offline (transações SQLite).
* ✅ **UI:** Ajustes de layout para dispositivos *edge-to-edge* (padding inferior).
* ✅ **Backend:** Atualização dos DTOs para suportar sincronização completa de campos.

---

Desenvolvido com 💙 por Glauber Andrei.
