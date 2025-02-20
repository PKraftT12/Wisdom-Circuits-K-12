# Educational Platform - Project Summary

## Core Files Structure
```
client/src/
├── App.tsx                    # Main application routing
├── pages/
│   ├── auth-page.tsx         # Authentication UI
│   ├── dashboard.tsx         # Student dashboard
│   └── teacher-dashboard.tsx # Teacher dashboard
├── lib/
│   ├── protected-route.tsx   # Authentication route wrapper
│   └── queryClient.ts        # API client configuration
└── hooks/
    └── use-auth.tsx          # Authentication hook and context
```

## File Contents

### 1. App.tsx
```tsx
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import TeacherDashboard from "@/pages/teacher-dashboard";
import AuthPage from "@/pages/auth-page";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/" component={() => <ProtectedRoute path="/" component={Dashboard} />} />
      <Route path="/teacher" component={() => <ProtectedRoute path="/teacher" component={TeacherDashboard} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
```

### 2. protected-route.tsx
```tsx
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Route, Redirect } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  return (
    <Route path={path}>
      {() => {
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-border" />
            </div>
          );
        }

        if (!user) {
          return <Redirect to="/auth" />;
        }

        return <Component />;
      }}
    </Route>
  );
}
```

### 3. queryClient.ts
```typescript
import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

### 4. auth-page.tsx
```tsx
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema, type InsertUser } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap } from "lucide-react";
import { SiGoogle, SiCanva } from 'react-icons/si';
import { Separator } from "@/components/ui/separator";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { user, loginMutation, registerMutation, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  // Force logout when auth page mounts
  useEffect(() => {
    logoutMutation.mutate();
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const loginForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      isTeacher: false,
    },
  });

  const registerForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      isTeacher: false,
    },
  });

  return (
    <div className="flex min-h-screen">
      {/* Form Section */}
      <div className="flex-1 flex items-center justify-center p-8">
        <Card className="w-full max-w-md p-6">
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Button variant="outline" className="flex items-center gap-2">
                    <SiGoogle className="w-4 h-4" />
                    Continue with Google Classroom
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <SiCanva className="w-4 h-4" />
                    Continue with Canvas
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Continue with Clever
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>

                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit((data) => loginMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <Input type="email" value={field.value || ''} onChange={field.onChange} />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <Input type="password" value={field.value || ''} onChange={field.onChange} />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign in"}
                    </Button>
                  </form>
                </Form>
              </div>
            </TabsContent>

            <TabsContent value="register">
              // Registration form implementation (similar structure to login form)
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Hero Section */}
      <div className="hidden lg:flex flex-1 bg-blue-50 items-center justify-center p-8">
        <div className="max-w-md text-center">
          <GraduationCap className="w-24 h-24 mx-auto mb-6 text-blue-500" />
          <h1 className="text-4xl font-bold mb-4">Welcome to Wisdom Circuits</h1>
          <p className="text-lg text-gray-600 mb-6">
            An advanced educational platform enabling dynamic, personalized learning experiences through innovative technology.
          </p>
          <div className="space-y-4 text-left bg-white p-6 rounded-lg shadow-sm">
            <h2 className="font-semibold text-xl mb-4">Key Features:</h2>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>Personalized Learning Paths</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>Interactive Teaching Tools</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>Real-time Progress Tracking</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 5. dashboard.tsx and teacher-dashboard.tsx
These files contain the implementations of the student and teacher dashboards respectively, with features like:
- Wisdom Circuit cards
- Interactive chat functionality
- Content management
- Teaching configuration
- File upload capabilities

Due to their length, they are referenced in the original repository at:
- `client/src/pages/dashboard.tsx`
- `client/src/pages/teacher-dashboard.tsx`

## Key Features Implemented
1. Authentication System
   - Email/password login
   - Social login integration (Google Classroom, Canvas, Clever)
   - Protected routes
   - Session management

2. Dashboard Features
   - Student dashboard with Wisdom Circuit cards
   - Interactive chat interface
   - Teacher dashboard with content management
   - File upload capabilities
   - Teaching style configuration

3. UI/UX
   - Responsive design
   - Modern component library (shadcn/ui)
   - Loading states
   - Error handling
   - Toast notifications

## Next Steps
1. Implement actual social login functionality
2. Enhance teacher dashboard features
3. Add more interactive elements to Wisdom Circuits
4. Implement real-time chat functionality
5. Add content management system
