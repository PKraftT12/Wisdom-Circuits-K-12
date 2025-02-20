import { useState, useRef, useEffect } from 'react';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertWisdomCircuitSchema, type InsertWisdomCircuit, type WisdomCircuit } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Mic, FileUp, LogOut, Volume2, Copy, PlusCircle, RefreshCw, Settings, Trash2, BookOpen } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import CircuitCard from '@/components/circuit-card';
import { UserSettingsDialog } from '@/components/user-settings-dialog';
import { Checkbox } from "@/components/ui/checkbox";
import { format } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Loader2 } from 'lucide-react';
import { Footer } from "@/components/ui/footer";

export function TeacherDashboard() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [selectedCircuit, setSelectedCircuit] = useState<WisdomCircuit | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [previousName, setPreviousName] = useState('');
  const [previousGrade, setPreviousGrade] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [circuitContent, setCircuitContent] = useState<any[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingInterval = useRef<NodeJS.Timeout>();

  // Query for active and archived circuits
  const { data: activeCircuits = [], isLoading: isLoadingActive } = useQuery<WisdomCircuit[]>({
    queryKey: ["/api/wisdom-circuits"],
    retry: 3,
    staleTime: 1000,
  });

  const { data: archivedCircuits = [], isLoading: isLoadingArchived } = useQuery<WisdomCircuit[]>({
    queryKey: ["/api/wisdom-circuits/archived"],
    retry: 3,
    staleTime: 1000,
  });

  // Archive circuit mutation
  const archiveCircuitMutation = useMutation({
    mutationFn: async (circuit: WisdomCircuit) => {
      const response = await apiRequest('POST', `/api/wisdom-circuits/${circuit.id}/archive`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to archive circuit');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wisdom-circuits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wisdom-circuits/archived'] });
      toast({
        title: 'Success',
        description: 'Circuit archived successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Unarchive circuit mutation
  const unarchiveCircuitMutation = useMutation({
    mutationFn: async (circuit: WisdomCircuit) => {
      const response = await apiRequest('POST', `/api/wisdom-circuits/${circuit.id}/unarchive`);
      if (!response.ok) {
        throw new Error('Failed to unarchive circuit');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wisdom-circuits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wisdom-circuits/archived'] });
      toast({
        title: 'Success',
        description: 'Circuit unarchived successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete circuit mutation with improved error handling and cache invalidation
  const deleteCircuitMutation = useMutation({
    mutationFn: async (circuit: WisdomCircuit) => {
      const response = await apiRequest('DELETE', `/api/wisdom-circuits/${circuit.id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete circuit');
      }
      return circuit.id;
    },
    onSuccess: (deletedCircuitId: number) => {
      // Force refetch both active and archived queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ['/api/wisdom-circuits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/wisdom-circuits/archived'] });

      // Remove from local cache immediately
      queryClient.setQueryData(['/api/wisdom-circuits'], (oldData: WisdomCircuit[] | undefined) =>
        oldData?.filter(c => c.id !== deletedCircuitId) ?? []
      );
      queryClient.setQueryData(['/api/wisdom-circuits/archived'], (oldData: WisdomCircuit[] | undefined) =>
        oldData?.filter(c => c.id !== deletedCircuitId) ?? []
      );

      toast({
        title: 'Success',
        description: 'Circuit deleted successfully',
      });
    },
    onError: (error: Error) => {
      console.error('Delete error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete circuit',
        variant: 'destructive',
      });
    },
  });

  // Form setup with proper schema validation
  const form = useForm<InsertWisdomCircuit>({
    resolver: zodResolver(insertWisdomCircuitSchema),
    mode: "onChange",
    defaultValues: {
      name: '',
      description: '',
      grade: 'K' as const,
      teachingStyles: ['hybrid'],
      homeworkPolicies: ['guide'],
      responseTypes: ['detailed'],
      stateAlignment: 'California',
      teacherId: user?.id || 1,
      teacherName: user?.displayName || 'Teacher'
    }
  });

  // Watch for changes in name and grade
  const name = form.watch('name');
  const grade = form.watch('grade');

  // Effect to auto-generate description when name or grade changes
  useEffect(() => {
    const shouldGenerateDescription =
      // Only generate if name has changed and is not empty
      (name && name !== previousName && name.length > 2) ||
      // Only generate if grade has changed and we already have a name
      (grade && grade !== previousGrade && form.getValues('name').length > 2);

    if (shouldGenerateDescription && !isGeneratingDescription) {
      handleGenerateDescription();
      setPreviousName(name);
      setPreviousGrade(grade);
    }
  }, [name, grade]);

  // Generate description mutation
  const generateDescriptionMutation = useMutation({
    mutationFn: async ({ title, grade }: { title: string; grade: string }) => {
      const response = await apiRequest('POST', '/api/wisdom-circuits/generate-description', {
        title,
        grade,
      });
      return response.json();
    },
    onSuccess: (data) => {
      form.setValue('description', data.description);
      setIsGeneratingDescription(false);
      toast({
        title: 'Success',
        description: 'Generated new description',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: 'Failed to generate description. Please enter one manually.',
        variant: 'destructive',
      });
      setIsGeneratingDescription(false);
    },
  });

  // Create circuit mutation with proper error handling
  const createCircuitMutation = useMutation({
    mutationFn: async (data: InsertWisdomCircuit) => {
      const response = await apiRequest('POST', '/api/wisdom-circuits', data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create circuit');
      }
      return response.json();
    },
    onSuccess: () => {
      setShowCreateDialog(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/wisdom-circuits'] });
      toast({
        title: 'Success',
        description: 'Wisdom Circuit created successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (isRecording) {
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
      setRecordingTime(0);
    }
    return () => {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        if (selectedCircuit) {
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          formData.append('circuitId', selectedCircuit.id.toString());

          try {
            toast({
              title: "Processing Recording",
              description: "Converting audio to transcript and filtering non-teacher voices...",
            });

            const response = await fetch('/api/transcribe', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              throw new Error('Failed to transcribe recording');
            }

            const data = await response.json();
            toast({
              title: "Success!",
              description: "Class recording has been transcribed and added to content.",
            });

            if (selectedCircuit) {
              const contentResponse = await fetch(`/api/circuit-content/${selectedCircuit.id}`);
              const content = await contentResponse.json();
              setCircuitContent(content);
            }
          } catch (error) {
            toast({
              title: "Error",
              description: "Failed to process recording. Please try again.",
              variant: "destructive",
            });
          }
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      toast({
        title: "Recording Started",
        description: "Your class is now being recorded.",
      });
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({
        title: "Error",
        description: "Failed to start recording. Please check your microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);

      toast({
        title: "Recording Stopped",
        description: "Processing your recording...",
      });
    }
  };

  const testAudio = async () => {
    try {
      setIsTestingAudio(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play();
        setIsTestingAudio(false);
      };

      mediaRecorder.start();

      setTimeout(() => {
        mediaRecorder.stop();
        stream.getTracks().forEach(track => track.stop());
      }, 3000);

      toast({
        title: "Testing Audio",
        description: "Recording a short test clip...",
      });
    } catch (error) {
      setIsTestingAudio(false);
      toast({
        title: "Error",
        description: "Failed to test audio. Please check your microphone permissions.",
        variant: "destructive",
      });
    }
  };

  const handleCircuitClick = async (circuit: WisdomCircuit) => {
    setSelectedCircuit(circuit);
    try {
      const response = await fetch(`/api/circuit-content/${circuit.id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch circuit content');
      }
      const content = await response.json();
      setCircuitContent(content);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch circuit content",
        variant: "destructive",
      });
    }
  };

  const handleContentUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCircuit) {
      toast({
        title: "Error",
        description: "No circuit selected",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData(e.target as HTMLFormElement);
    formData.append("circuitId", selectedCircuit.id.toString());

    try {
      const response = await fetch(`/api/circuit-content/${selectedCircuit.id}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload content');
      }

      const contentResponse = await fetch(`/api/circuit-content/${selectedCircuit.id}`);
      if (!contentResponse.ok) {
        throw new Error('Failed to fetch updated content');
      }

      const updatedContent = await contentResponse.json();
      setCircuitContent(updatedContent);

      (e.target as HTMLFormElement).reset();

      toast({
        title: "Success",
        description: "Content uploaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to upload content",
        variant: "destructive",
      });
    }
  };

  const handleDeleteContent = async (contentId: number) => {
    try {
      const response = await fetch(`/api/circuit-content/${contentId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete content');
      }

      setCircuitContent(current => current.filter(content => content.id !== contentId));

      toast({
        title: "Success",
        description: "Content deleted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete content",
        variant: "destructive",
      });
    }
  };


  // Handle description generation
  const handleGenerateDescription = async () => {
    const title = form.getValues('name');
    const grade = form.getValues('grade');

    if (!title || title.length < 3) {
      // Don't show error toast on initial load
      if (previousName !== '') {
        toast({
          title: 'Error',
          description: 'Please enter a meaningful circuit name first',
          variant: 'destructive',
        });
      }
      return;
    }

    setIsGeneratingDescription(true);
    generateDescriptionMutation.mutate({ title, grade });
  };

  // Form submission handler with proper validation
  const onSubmit = async (data: InsertWisdomCircuit) => {
    try {
      await createCircuitMutation.mutateAsync({
        ...data,
        teacherId: user?.id || 1,
        teacherName: user?.displayName || 'Teacher'
      });
    } catch (error: any) {
      console.error('Submit error:', error);
      toast({
        title: 'Error creating circuit',
        description: error.message || 'An error occurred while creating the circuit',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 min-h-screen flex flex-col">
      {/* Header section */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="text-gray-600">Manage your Wisdom Circuits</p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2"
          >
            <PlusCircle className="h-4 w-4" />
            Create New Wisdom Circuit
          </Button>
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-14 w-14 rounded-full">
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.displayName || 'default'}`}
                  alt="User avatar"
                  className="h-full w-full rounded-full"
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowSettingsDialog(true)}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => logoutMutation.mutate()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Settings Dialog */}
      <UserSettingsDialog
        open={showSettingsDialog}
        onOpenChange={setShowSettingsDialog}
        circuits={activeCircuits}
        archivedCircuits={archivedCircuits}
        onArchive={circuit => archiveCircuitMutation.mutate(circuit)}
        onUnarchive={circuit => unarchiveCircuitMutation.mutate(circuit)}
        onDelete={circuit => deleteCircuitMutation.mutate(circuit)}
        onCircuitClick={handleCircuitClick}
      />

      {/* Create Circuit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader>
            <DialogTitle>Create New Wisdom Circuit</DialogTitle>
            <DialogDescription>
              Configure your new teaching circuit with the settings below.
            </DialogDescription>
          </DialogHeader>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit(onSubmit)(e);
            }}
            className="flex-1 overflow-y-auto space-y-4 pr-2"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Circuit Name</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Enter circuit name"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="grade">Grade Level</Label>
                <Select
                  onValueChange={(value) => form.setValue('grade', value as InsertWisdomCircuit['grade'])}
                  defaultValue={form.getValues('grade')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade level" />
                  </SelectTrigger>
                  <SelectContent>
                    {['K', ...Array(12).fill(0).map((_, i) => String(i + 1))].map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade === 'K' ? 'Kindergarten' : `Grade ${grade}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.grade && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.grade.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="description">Description</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateDescription}
                    disabled={isGeneratingDescription}
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${isGeneratingDescription ? 'animate-spin' : ''}`} />
                    {isGeneratingDescription ? 'Generating...' : 'Regenerate'}
                  </Button>
                </div>
                <Textarea
                  id="description"
                  {...form.register('description')}
                  placeholder="Description will be automatically generated when you enter a name and grade level"
                  rows={4}
                />
                {form.formState.errors.description && (
                  <p className="text-sm text-destructive mt-1">
                    {form.formState.errors.description.message}
                  </p>
                )}
              </div>

              <div className="space-y-6">
                <h3 className="text-lg font-medium">Teaching Configuration</h3>

                <div className="space-y-4">
                  <div>
                    <Label>Teaching Styles</Label>
                    <div className="space-y-2 mt-2">
                      <div className="bg-muted/30 p-4 rounded-lg space-y-4">
                        <div className="flex items-start space-x-3 bg-blue-50/50 p-3 rounded-lg">
                          <Checkbox
                            id="authority"
                            {...form.register('teachingStyles')}
                            value="authority"
                          />
                          <div>
                            <Label htmlFor="authority" className="font-medium">Authority (or Lecture) Style</Label>
                            <p className="text-sm text-muted-foreground">
                              This is a traditional, teacher-centered approach where the teacher delivers information through lectures, with limited student interaction.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-3 bg-green-50/50 p-3 rounded-lg">
                          <Checkbox
                            id="demonstrator"
                            {...form.register('teachingStyles')}
                            value="demonstrator"
                          />
                          <div>
                            <Label htmlFor="demonstrator" className="font-medium">Demonstrator (or Coach) Style</Label>
                            <p className="text-sm text-muted-foreground">
                              The teacher demonstrates concepts or skills, often using visual aids or hands-on activities, while still retaining a degree of authority.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-3 bg-purple-50/50 p-3 rounded-lg">
                          <Checkbox
                            id="facilitator"
                            {...form.register('teachingStyles')}
                            value="facilitator"
                          />
                          <div>
                            <Label htmlFor="facilitator" className="font-medium">Facilitator (or Activity) Style</Label>
                            <p className="text-sm text-muted-foreground">
                              The teacher acts as a guide, creating opportunities for students to explore, question, and discover concepts through activities and discussions.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-3 bg-yellow-50/50 p-3 rounded-lg">
                          <Checkbox
                            id="delegator"
                            {...form.register('teachingStyles')}
                            value="delegator"
                          />
                          <div>
                            <Label htmlFor="delegator" className="font-medium">Delegator (or Group) Style</Label>
                            <p className="text-sm text-muted-foreground">
                              Students take a more active role in their learning, working independently or in groups, with the teacher acting as a facilitator or mentor.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start space-x-3 bg-pink-50/50 p-3 rounded-lg">
                          <Checkbox
                            id="hybrid"
                            {...form.register('teachingStyles')}
                            value="hybrid"
                            defaultChecked
                          />
                          <div>
                            <Label htmlFor="hybrid" className="font-medium">Hybrid (or Blended) Style</Label>
                            <p className="text-sm text-muted-foreground">
                              This approach combines elements of different styles, offering a balanced approach to teaching and learning.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Homework Policies</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="guide"
                          {...form.register('homeworkPolicies')}
                          value="guide"
                          defaultChecked
                        />
                        <Label htmlFor="guide">Guide Only</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="verify"
                          {...form.register('homeworkPolicies')}
                          value="verify"
                          defaultChecked
                        />
                        <Label htmlFor="verify">Verify Answers</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="examples"
                          {...form.register('homeworkPolicies')}
                          value="examples"
                          defaultChecked
                        />
                        <Label htmlFor="examples">Provide Examples</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="no-solutions"
                          {...form.register('homeworkPolicies')}
                          value="no-solutions"
                          defaultChecked
                        />
                        <Label htmlFor="no-solutions">No Direct Solutions</Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label>Response Types</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="detailed"
                          {...form.register('responseTypes')}
                          value="detailed"
                          defaultChecked
                        />
                        <Label htmlFor="detailed">Detailed</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="concise"
                          {...form.register('responseTypes')}
                          value="concise"
                          defaultChecked
                        />
                        <Label htmlFor="concise">Concise</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="step-by-step"
                          {...form.register('responseTypes')}
                          value="step-by-step"
                          defaultChecked
                        />
                        <Label htmlFor="step-by-step">Step-by-Step</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="conceptual"
                          {...form.register('responseTypes')}
                          value="conceptual"
                          defaultChecked
                        />
                        <Label htmlFor="conceptual">Conceptual</Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="stateAlignment">State Alignment</Label>
                    <Select
                      {...form.register('stateAlignment')}
                      onValueChange={(value) => form.setValue('stateAlignment', value)}
                      defaultValue="California"
                    >
                      <SelectTrigger id="stateAlignment">
                        <SelectValue placeholder="Select state" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="California">California</SelectItem>
                        <SelectItem value="Texas">Texas</SelectItem>
                        <SelectItem value="New York">New York</SelectItem>
                        <SelectItem value="Florida">Florida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createCircuitMutation.isPending}
              >
                {createCircuitMutation.isPending ? 'Creating...' : 'Create Circuit'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Circuit Grid - Only showing database circuits */}
      {isLoadingActive ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {activeCircuits.map((circuit) => (
            <div
              key={circuit.id}
              className={`bg-blue-50 aspect-square rounded-xl p-4 relative
                overflow-hidden transition-all duration-300
                border border-gray-200 shadow-md
                hover:shadow-xl hover:scale-105 hover:bg-blue-100 hover:border-blue-300
                group cursor-pointer ${selectedCircuit?.id === circuit.id ? 'ring-2 ring-blue-500' : ''}`}
              onClick={() => handleCircuitClick(circuit)}
            >
              <div className="absolute -bottom-4 -right-4 opacity-100 transition-transform duration-300 group-hover:scale-110">
                <BookOpen className="w-40 h-40 text-blue-500/20" strokeWidth={1.5} />
              </div>

              <div className="relative z-10">
                <span className="text-sm font-bold uppercase tracking-wider text-blue-700">
                  {circuit.name}
                </span>

                <h2 className="text-xl font-bold text-gray-800 mt-4 tracking-tight group-hover:text-blue-600">
                  {circuit.grade === 'K' ? 'Kindergarten' : `Grade ${circuit.grade}`}
                </h2>

                <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                  {circuit.description}
                </p>

                <div className="mt-4 flex items-center text-sm text-gray-500">
                  <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 rounded">
                    Code: {circuit.code}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Circuit Dialog */}
      {selectedCircuit && (
        <Dialog open={!!selectedCircuit} onOpenChange={(open) => !open && setSelectedCircuit(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <DialogHeader>
              <DialogTitle>Circuit: {selectedCircuit.name}</DialogTitle>
              <DialogDescription>
                Manage circuit content and settings
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="content" className="flex-1">
              <TabsList>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>

              <TabsContent value="content" className="flex-1 overflow-y-auto">
                <ScrollArea className="h-[calc(90vh-180px)]">
                  <div className="space-y-8 pr-4">
                    {/* Record a Class Section */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold">Record a Class</h3>
                      <div className="border rounded-lg p-6 bg-muted/30">
                        <div className="text-sm text-gray-600 mb-6">
                          Record your class lesson. Hit record, then hit stop when done.
                          Your Circuit will convert the audio recording to a transcript,
                          delete all voices except your own, and add the class lesson
                          transcript to the Uploaded Content to help train your Circuit
                          how to support and engage your students.
                        </div>
                        <div className="flex flex-col items-center gap-6">
                          {!isRecording ? (
                            <Button
                              onClick={startRecording}
                              className="w-24 h-24 rounded-full p-0 bg-green-500 hover:bg-green-600 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl disabled:opacity-50 disabled:hover:scale-100"
                              disabled={isTestingAudio}
                            >
                              <div className="flex flex-colitems-center justify-center">
                                <Mic className="w-8 h-8 mb-1" />
                                <span className="text-sm font-medium">Record</span>
                              </div>
                            </Button>
                          ) : (
                            <Button
                              onClick={stopRecording}
                              className="w-24 h-24 rounded-full p-0 bg-red-500 hover:bg-red-600 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl relative"
                            >
                              <div className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></div>
                              <div className="flex flex-col items-center justify-center relative z-10">
                                <div className="w-2 h-2 rounded-full bg-white animate-pulse mb-1"></div>
                                <span className="text-sm font-medium">Stop</span>
                                <span className="text-xs mt-1">{formatTime(recordingTime)}</span>
                              </div>
                            </Button>
                          )}
                          <Button
                            onClick={testAudio}
                            variant="outline"
                            size="sm"
                            className="text-sm"
                            disabled={isRecording || isTestingAudio}
                          >
                            <Volume2 className="w-4 h-4 mr-2" />
                            Test Audio
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Upload Content Section */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold">Upload Content</h3>
                      <div className="border rounded-lg p-6 bg-muted/30">
                        <form onSubmit={handleContentUpload} className="space-y-4">
                          <div className="grid gap-4">
                            <div>
                              <Label htmlFor="title">Title</Label>
                              <Input
                                id="title"
                                name="title"
                                placeholder="Enter content title"
                                required
                              />
                            </div>
                            <div>
                              <Label htmlFor="description">Description</Label>
                              <Textarea
                                id="description"
                                name="description"
                                placeholder="Enter content description"
                                rows={3}
                              />
                            </div>
                            <div>
                              <Label htmlFor="category">Category</Label>
                              <Select name="category" defaultValue="reference_material">
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="syllabus">Syllabus</SelectItem>
                                  <SelectItem value="worksheet">Worksheet</SelectItem>
                                  <SelectItem value="pacing_guide">Pacing Guide</SelectItem>
                                  <SelectItem value="lesson_plan">Lesson Plan</SelectItem>
                                  <SelectItem value="reference_material">Reference Material</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label htmlFor="file">File</Label>
                              <Input
                                id="file"
                                name="file"
                                type="file"
                                accept=".pdf,.doc,.docx,.txt"
                              />
                            </div>
                          </div>
                          <Button type="submit" className="w-full">
                            <FileUp className="h-4 w-4 mr-2" />
                            Upload Content
                          </Button>
                        </form>
                      </div>
                    </div>

                    {/* Uploaded Content Section */}
                    <div className="space-y-4">
                      <h3 className="text-xl font-semibold">Uploaded Content</h3>
                      <div className="border rounded-lg">
                        {circuitContent.length === 0 ? (
                          <div className="p-8 text-center text-gray-500">
                            No content uploaded yet.
                          </div>
                        ) : (
                          <>
                            <div className="bg-muted/50 p-3 grid grid-cols-12 gap-4 text-sm font-medium border-b">
                              <div className="col-span-4">Title</div>
                              <div className="col-span-3">Category</div>
                              <div className="col-span-3">Uploaded</div>
                              <div className="col-span-2 text-right">Actions</div>
                            </div>
                            <div className="p-3 space-y-2">
                              {circuitContent.map((content: any) => (
                                <div
                                  key={content.id}
                                  className="grid grid-cols-12 gap-4 items-center hover:bg-muted/50 rounded-lg p-2"
                                >
                                  <div className="col-span-4">
                                    <div className="font-medium">{content.title}</div>
                                    <div className="text-sm text-gray-500">{content.description}</div>
                                  </div>
                                  <div className="col-span-3 capitalize">
                                    {content.category.replace('_', ' ')}
                                  </div>
                                  <div className="col-span-3 text-sm text-gray-500">
                                    {content.uploadedAt && format(new Date(content.uploadedAt), 'PPp')}
                                  </div>
                                  <div className="col-span-2 flex justify-end gap-2">
                                    {content.contentUrl && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => window.open(content.contentUrl, '_blank')}
                                      >
                                        View
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteContent(content.id)}
                                    >
                                      <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="settings" className="flex-1 overflow-y-auto">
                <ScrollArea className="h-[calc(90vh-180px)]">
                  <div className="space-y-6 pr-4">
                    <form className="space-y-4">
                      <div className="grid gap-4">
                        <div>
                          <Label htmlFor="name">Circuit Name</Label>
                          <Input
                            id="name"
                            name="name"
                            defaultValue={selectedCircuit.name}
                            placeholder="Enter circuit name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="gradeLevel">Grade Level</Label>
                          <Select defaultValue={selectedCircuit.grade}>
                            <SelectTrigger id="gradeLevel">
                              <SelectValue placeholder="Select grade level" />
                            </SelectTrigger>
                            <SelectContent>
                              {['K', ...Array(12).fill(0).map((_, i) => String(i + 1))].map((grade) => (
                                <SelectItem key={grade} value={grade}>
                                  {grade === 'K' ? 'Kindergarten' : `Grade ${grade}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            name="description"
                            defaultValue={selectedCircuit.description}
                            placeholder="Enter circuit description"
                          />
                        </div>

                        <div className="space-y-6">
                          <h3 className="text-lg font-medium">Teaching Configuration</h3>

                          <div className="space-y-4">
                            <div>
                              <Label>Teaching Styles</Label>
                              <div className="space-y-2 mt-2">
                                <div className="bg-muted/30 p-4 rounded-lg space-y-4">
                                  <div className="flex items-start space-x-3 bg-blue-50/50 p-3 rounded-lg">
                                    <Checkbox
                                      id="authority"
                                      defaultChecked={selectedCircuit.teachingStyles?.includes('authority')}
                                    />
                                    <div>
                                      <Label htmlFor="authority" className="font-medium">Authority (or Lecture) Style</Label>
                                      <p className="text-sm text-muted-foreground">
                                        This is a traditional, teacher-centered approach where the teacher delivers information through lectures, with limited student interaction.
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-start space-x-3 bg-green-50/50 p-3 rounded-lg">
                                    <Checkbox
                                      id="demonstrator"
                                      defaultChecked={selectedCircuit.teachingStyles?.includes('demonstrator')}
                                    />
                                    <div>
                                      <Label htmlFor="demonstrator" className="font-medium">Demonstrator (or Coach) Style</Label>
                                      <p className="text-sm text-muted-foreground">
                                        The teacher demonstrates concepts or skills, often using visual aids or hands-on activities, while still retaining a degree of authority.
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-start space-x-3 bg-purple-50/50 p-3 rounded-lg">
                                    <Checkbox
                                      id="facilitator"
                                      defaultChecked={selectedCircuit.teachingStyles?.includes('facilitator')}
                                    />
                                    <div>
                                      <Label htmlFor="facilitator" className="font-medium">Facilitator (or Activity) Style</Label>
                                      <p className="text-sm text-muted-foreground">
                                        The teacher acts as a guide, creating opportunities for students to explore, question, and discover concepts through activities and discussions.
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-start space-x-3 bg-yellow-50/50 p-3 rounded-lg">
                                    <Checkbox
                                      id="delegator"
                                      defaultChecked={selectedCircuit.teachingStyles?.includes('delegator')}
                                    />
                                    <div>
                                      <Label htmlFor="delegator" className="font-medium">Delegator (or Group) Style</Label>
                                      <p className="text-sm text-muted-foreground">
                                        Students take a more active role in their learning, working independently or in groups, with the teacher acting as a facilitator or mentor.
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-start space-x-3 bg-pink-50/50 p-3 rounded-lg">
                                    <Checkbox
                                      id="hybrid"
                                      defaultChecked={selectedCircuit.teachingStyles?.includes('hybrid')}
                                    />
                                    <div>
                                      <Label htmlFor="hybrid" className="font-medium">Hybrid (or Blended) Style</Label>
                                      <p className="text-sm text-muted-foreground">
                                        This approach combines elements of different styles, offering a balanced approach to teaching and learning.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div>
                              <Label>Homework Policies</Label>
                              <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="guide"
                                    defaultChecked={selectedCircuit.homeworkPolicies?.includes('guide')}
                                  />
                                  <Label htmlFor="guide">Guide Only</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="verify"
                                    defaultChecked={selectedCircuit.homeworkPolicies?.includes('verify')}
                                  />
                                  <Label htmlFor="verify">Verify Answers</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="examples"
                                    defaultChecked={selectedCircuit.homeworkPolicies?.includes('examples')}
                                  />
                                  <Label htmlFor="examples">Provide Examples</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="no-solutions"
                                    defaultChecked={selectedCircuit.homeworkPolicies?.includes('no-solutions')}
                                  />
                                  <Label htmlFor="no-solutions">No Direct Solutions</Label>
                                </div>
                              </div>
                            </div>

                            <div>
                              <Label>Response Types</Label>
                              <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="detailed"
                                    defaultChecked={selectedCircuit.responseTypes?.includes('detailed')}
                                  />
                                  <Label htmlFor="detailed">Detailed</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="concise"
                                    defaultChecked={selectedCircuit.responseTypes?.includes('concise')}
                                  />
                                  <Label htmlFor="concise">Concise</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="step-by-step"
                                    defaultChecked={selectedCircuit.responseTypes?.includes('step-by-step')}
                                  />
                                  <Label htmlFor="step-by-step">Step-by-Step</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="conceptual"
                                    defaultChecked={selectedCircuit.responseTypes?.includes('conceptual')}
                                  />
                                  <Label htmlFor="conceptual">Conceptual</Label>
                                </div>
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="state-alignment">State Alignment</Label>
                              <Select defaultValue={selectedCircuit.stateAlignment}>
                                <SelectTrigger id="state-alignment">
                                  <SelectValue placeholder="Select state" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="California">California</SelectItem>
                                  <SelectItem value="Texas">Texas</SelectItem>
                                  <SelectItem value="New York">New York</SelectItem>
                                  <SelectItem value="Florida">Florida</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        </div>

                        <Button type="submit" className="w-full">
                          Save Settings
                        </Button>
                      </div>
                    </form>

                    <div className="flex items-center gap-2 bg-muted/50 p-4 rounded-lg">
                      <span className="text-sm font-medium">Circuit Code: {selectedCircuit.code}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(selectedCircuit.code || '');
                            toast({
                              title: "Copied!",
                              description: "Circuit code copied to clipboard",
                            });
                          } catch (err) {
                            console.error('Failed to copy:', err);
                          }
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="reports" className="flex-1 overflow-y-auto">
                <ScrollArea className="h-[calc(90vh-180px)]">
                  <div className="space-y-8 pr-4">
                    <div className="grid grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Student Engagement</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={[
                              { date: '2/1', engagement: 65 },
                              { date: '2/8', engagement: 75 },
                              { date: '2/15', engagement: 85 },
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="engagement" stroke="#8884d8" />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle>Content Categories</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={[
                              { category: 'Worksheets', count: 8 },
                              { category: 'Recordings', count: 12 },
                              { category: 'Reference', count: 5 },
                            ]}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="category" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="count" fill="#82ca9d" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>

                    <Card>
                      <CardHeader>
                        <CardTitle>Weekly Activity Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-3 gap-4">
                            <div className="bg-muted/50 p-4 rounded-lg text-center">
                              <div className="text-2xl font-bold">24</div>
                              <div className="text-sm text-gray-600">Active Students</div>
                            </div>
                            <div className="bg-muted/50 p-4 rounded-lg text-center">
                              <div className="text-2xl font-bold">18</div>
                              <div className="text-sm text-gray-600">New Contents</div>
                            </div>
                            <div className="bg-muted/50 p-4 rounded-lg text-center">
                              <div className="text-2xl font-bold">89%</div>
                              <div className="text-sm text-gray-600">Completion Rate</div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      <Footer />
    </div>
  );
}

export default TeacherDashboard;