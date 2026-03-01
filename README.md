# 🏦 Mordomo - Controle Financeiro Inteligente

> **Gerencie suas finanças de forma simples e inteligente com dashboard intuitivo, relatórios detalhados e assistente integrado.**

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

## 📖 Sobre o Projeto

O **Mordomo** é uma aplicação web moderna para controle financeiro pessoal e empresarial, desenvolvida com foco na simplicidade e eficiência. Com interface intuitiva e recursos avançados, oferece uma solução completa para gestão de finanças.

### 🎯 Objetivos

- Simplificar o controle financeiro diário
- Fornecer insights através de relatórios detalhados
- Centralizar todas as informações financeiras em um só lugar
- Oferecer experiência de usuário excepcional

## ✨ Funcionalidades

### 💰 **Gestão Financeira Core**

- **Dashboard Interativo** - Visão geral das finanças em tempo real
- **Receitas & Despesas** - Controle completo de entradas e saídas
- **Categorização Inteligente** - Organize suas transações por categorias personalizáveis
- **Gestão de Dívidas** - Acompanhe e controle seus compromissos financeiros
- **Metas Financeiras** - Defina e monitore objetivos financeiros

### 📊 **Relatórios e Análises**

- **Relatórios Detalhados** - Análises profundas do comportamento financeiro
- **Dashboard Empresarial** - Métricas específicas para negócios
- **Visualizações Gráficas** - Gráficos e charts informativos

### 🚗 **Gestão de Veículos** (Diferencial)

- **Controle de Quilometragem** - Monitore o uso dos seus veículos
- **Manutenções Programadas** - Gerencie tipos de manutenção personalizáveis
- **Custos Operacionais** - Acompanhe gastos relacionados aos veículos

### 🛒 **Recursos Adicionais**

- **Lista de Mercado** - Planeje suas compras
- **Integração com IA** - Assistente inteligente para insights financeiros
- **Sistema de Autenticação** - Login seguro com gestão de perfil
- **Interface Responsiva** - Acesso completo em dispositivos móveis

## 🛠️ Tecnologias Utilizadas

### **Frontend**

- **React 18** - Biblioteca para interfaces de usuário
- **TypeScript** - Superset JavaScript com tipagem estática
- **Vite** - Build tool rápida e moderna
- **Tailwind CSS** - Framework CSS utility-first
- **shadcn/ui** - Componentes de UI modernos e acessíveis

### **Ferramentas de Desenvolvimento**

- **ESLint** - Linting de código
- **PostCSS** - Processamento de CSS
- **React Hooks** - Gerenciamento de estado e efeitos
- **Lucide React** - Ícones modernos

## 📁 Estrutura do Projeto

```
as-mordomo/
├── public/                 # Arquivos estáticos
│   ├── favicon.ico
│   └── lovable-uploads/   # Assets do projeto
├── src/
│   ├── components/        # Componentes React
│   │   ├── auth/         # Componentes de autenticação
│   │   ├── ui/           # Componentes base (shadcn/ui)
│   │   └── [modais]      # Modais específicos do domínio
│   ├── pages/            # Páginas da aplicação
│   │   ├── Dashboard.tsx
│   │   ├── Receitas.tsx
│   │   ├── Despesas.tsx
│   │   ├── Veiculos.tsx
│   │   └── [...]
│   ├── hooks/            # Hooks customizados
│   ├── lib/              # Utilitários e helpers
│   └── [arquivos base]
├── [arquivos de configuração]
└── README.md
```

## 🚀 Como Executar

### **Pré-requisitos**

- Node.js 18+ instalado
- npm ou yarn
- Git

### **Instalação**

1. **Clone o repositório**

```bash
git clone [https://github.com/URL-DO-SEU-REPOSITORIO/mordomo.git]
cd mordomo-main
```

2. **Instale as dependências**

```bash
npm install
# ou
yarn install
```

3. **Execute em modo de desenvolvimento**

```bash
npm run dev
# ou
yarn dev
```

4. **Acesse a aplicação**

```
http://localhost:8080
```

### **Scripts Disponíveis**

```bash
npm run dev          # Executa em modo desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview do build de produção
npm run lint         # Executa o linting do código
```

## ⚙️ Configuração

### **Variáveis de Ambiente**

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Configurações da aplicação
VITE_APP_NAME=Mordomo
VITE_API_URL=http://localhost:3000/api

# Configurações de terceiros (se aplicável)
VITE_ANALYTICS_ID=your_analytics_id
```

### **Personalização de Tema**

O projeto utiliza CSS Variables para temas. Edite em `src/index.css`:

```css
:root {
  --primary: 222.2 84% 4.9%;
  --secondary: 210 40% 95%;
  /* ... outras variáveis */
}
```

## 🔧 Desenvolvimento

### **Estrutura de Componentes**

```typescript
// Exemplo de componente tipado
interface ComponenteProps {
  titulo: string;
  valor?: number;
  onAction: () => void;
}

export function MeuComponente({ titulo, valor, onAction }: ComponenteProps) {
  return (
    <div className="p-4 border rounded-lg">
      <h3 className="text-lg font-semibold">{titulo}</h3>
      {valor && <p className="text-2xl">{valor}</p>}
      <button onClick={onAction}>Ação</button>
    </div>
  );
}
```

### **Boas Práticas**

- ✅ Sempre use TypeScript com tipagem explícita
- ✅ Componentes funcionais com hooks
- ✅ Nomeação clara e descritiva
- ✅ Arquivos pequenos e focados (máximo 200 linhas)
- ✅ Comentários explicativos em lógicas complexas

## 📊 Performance

- **Build otimizado** com Vite
- **Tree shaking** automático
- **Lazy loading** de componentes não críticos
- **CSS otimizado** com Tailwind CSS purge
- **Imagens otimizadas** com WebP quando possível

## 👨‍💻 Autor

**Equipe Mordomo**

- 🌐 Website: [clubdosoftware.com.br](https://clubdosoftware.com.br)

---

<div align="center">

**Feito com ❤️ para simplificar sua vida financeira**

[🏠 Home](https://clubdosoftware.com.br) • [📚 Docs](https://clubdosoftware.com.br/mordomo.html)

</div>
