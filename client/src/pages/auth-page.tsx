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
import { SiGoogle, SiCanva } from 'react-icons/si';
import { GraduationCap } from 'lucide-react';
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { user, loginMutation, registerMutation, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();

  // Force logout when auth page mounts, but don't show the toast
  useEffect(() => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        // Intentionally empty to prevent toast notification
      }
    });
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const loginForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema.pick({ 
      email: true, 
      password: true 
    })),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<InsertUser>({
    resolver: zodResolver(insertUserSchema),
    defaultValues: {
      email: "",
      password: "",
      isTeacher: false,
      authProvider: 'local',
    },
  });

  const onLoginSubmit = async (data: InsertUser) => {
    console.log('Login form data:', { email: data.email, hasPassword: !!data.password });
    loginMutation.mutate(data);
  };

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
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <Input 
                            type="email" 
                            placeholder="Enter your email"
                            {...field} 
                          />
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
                          <Input 
                            type="password"
                            placeholder="Enter your password" 
                            {...field} 
                          />
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
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Button variant="outline" className="flex items-center gap-2">
                    <SiGoogle className="w-4 h-4" />
                    Sign up with Google Classroom
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <SiCanva className="w-4 h-4" />
                    Sign up with Canvas
                  </Button>
                  <Button variant="outline" className="flex items-center gap-2">
                    <GraduationCap className="w-4 h-4" />
                    Sign up with Clever
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Or sign up with email
                    </span>
                  </div>
                </div>

                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit((data) => registerMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <Input type="email" {...field} />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <Input type="password" {...field} />
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="isTeacher"
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <Input
                            type="checkbox"
                            className="w-4 h-4"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                          />
                          <FormLabel className="!mb-0">Register as a teacher</FormLabel>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                    >
                      {registerMutation.isPending ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </Form>
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Hero Section */}
      <div className="hidden lg:flex flex-1 bg-blue-50 items-center justify-center p-8">
        <div className="max-w-xl px-8">
          <img
            src="/WisdomCircuit_Logo_Final_1.png"
            alt="Wisdom Circuit"
            className="h-24 w-auto mx-auto mb-8"
          />
          <h1 className="text-3xl font-bold mb-6 flex flex-col gap-2">
            <span className="text-gray-800">Fueling Knowledge.</span>
            <span className="text-[#FDC537]">Igniting Success.</span>
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed mb-4">
            Struggling with homework or need a quick lesson refresher? Wisdom Circuits pull directly
            from your teacher's lessons, giving you clear, class-specific guidance instead of random
            internet answers.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed mt-4">
            Get step-by-step explanations, ask questions privately without fear,
            and learn in the way that works best for you with text-to-speech and multilingual support.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed mt-4">
            Whether you need help understanding a concept or just want to review, Wisdom Circuits are
            here to make learning easier, clearer, and more accessible—anytime, anywhere.
          </p>
        </div>
      </div>
    </div>
  );
}