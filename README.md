# 🧠 Reframe

Aplicativo de **terapia cognitivo-comportamental (TCC)** desenvolvido em **React Native (Expo)** e **NestJS**, com arquitetura monorepo usando **Nx**.

O objetivo é ajudar pacientes a **registrar e reestruturar pensamentos automáticos**, permitindo que terapeutas analisem padrões e acompanhem o progresso terapêutico.

---

## 🚀 Tecnologias

| Camada            | Stack               |
| ----------------- | ------------------- |
| **Mobile (App)**  | React Native + Expo |
| **API (Backend)** | NestJS              |
| **Monorepo**      | Nx                  |
| **Linguagem**     | TypeScript          |

---

## 🧩 Estrutura do Projeto

```
reframe/
├── apps/
│   ├── api/        # Aplicação NestJS (backend)
│   └── mobile/     # Aplicação React Native (Expo)
│
├── libs/
│   └── shared/     # Código compartilhado (DTOs, tipos, validações)
│
├── nx.json
├── package.json
├── tsconfig.base.json
└── README.md
```

---

## ⚙️ Instalação

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/reframe.git
cd reframe

# Instale as dependências
npm install
```

---

## 🧱 Executando o Backend (NestJS)

```bash
nx serve api
```

O servidor iniciará em: [http://localhost:3000](http://localhost:3000)

---

## 📱 Executando o App Mobile (Expo)

```bash
nx start mobile
```

O terminal exibirá um QR code para abrir o app no dispositivo físico ou emulador via Expo Go.

---

## 🧠 Conceito do App

O **Reframe** se baseia nos princípios da **Terapia Cognitivo-Comportamental (TCC)**.
O paciente pode registrar pensamentos automáticos e emoções associadas, e o terapeuta utiliza esses dados para promover **reestruturação cognitiva** — um processo de identificar e reformular padrões de pensamento disfuncionais.

---

## 🧑‍💻 Desenvolvimento

* Monorepo gerenciado por **Nx**
* Compartilhamento de tipos e DTOs entre backend e frontend
* Estrutura escalável e modular

---

## 📝 Licença

Este projeto está sob a licença MIT.
Sinta-se à vontade para usar, modificar e contribuir!

---
