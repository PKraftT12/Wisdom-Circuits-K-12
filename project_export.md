├── client/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── lib/
│   │   ├── pages/
│   │   │   ├── teacher-dashboard.tsx
│   │   │   ├── auth-page.tsx
│   │   │   ├── dashboard.tsx
│   │   │   └── not-found.tsx
│   │   ├── App.tsx
│   │   ├── index.css
│   │   └── main.tsx
│   └── index.html
├── server/
├── shared/
└── uploads/
```

## Setup Instructions

1. Create a new project directory and navigate to it:
```bash
mkdir educational-platform-v1.5
cd educational-platform-v1.5
```

2. Install dependencies:
```bash
npm install @hookform/resolvers @radix-ui/react-checkbox @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-tabs @tanstack/react-query date-fns express lucide-react openai react-hook-form recharts tailwindcss typescript wouter zod
```

3. Set up environment variables (create a .env file):
```env
DATABASE_URL=postgresql://[your-postgresql-url]
SESSION_SECRET=[your-session-secret]
OPENAI_API_KEY=[your-openai-key]
```

4. Create PostgreSQL database:
Use the create_postgresql_database_tool provided by your hosting platform.

5. Start the development server:
```bash
npm run dev