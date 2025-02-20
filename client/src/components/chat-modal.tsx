import { useState, useRef, useEffect } from 'react';
import { X, Send, LucideIcon, Mic, Volume2, StopCircle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ChatMessage {
  sender: string;
  message: string;
}

interface CircuitSettings {
  grade: string;
  stateStandards?: string;
  subjectArea?: string;
  difficultyLevel?: string;
  teachingStyle?: string;
  learningObjectives?: string[];
}

interface ChatModalProps {
  circuit: {
    subject: string;
    teacher: string;
    Icon: LucideIcon;
    bgColor: string;
    accentColor: string;
    teacherVoiceId?: string;
    settings?: CircuitSettings;
  } | null;
  isOpen: boolean;
  onClose: () => void;
}

const CHAT_SUGGESTIONS = [
  [
    { text: "I was absent. What did I miss?", icon: "🎯" },
    { text: "Review today's lesson", icon: "📚" },
    { text: "Help with homework", icon: "✏️" },
    { text: "I need extra practice", icon: "🎯" },
    { text: "Explain a concept", icon: "💡" },
    { text: "Check my work", icon: "✅" },
    { text: "Next test/quiz", icon: "📅" },
    { text: "Create a study guide", icon: "📝" },
    { text: "Practice problems", icon: "🔢" },
  ],
  [
    { text: "Break this down step by step", icon: "🪜" },
    { text: "Can you explain it differently?", icon: "🔄" },
    { text: "Show me an example", icon: "👀" },
    { text: "What are the key points?", icon: "🎯" },
    { text: "Why is this important?", icon: "❓" },
    { text: "How does this connect to real life?", icon: "🌎" },
    { text: "What should I focus on?", icon: "🎯" },
    { text: "I'm stuck, can you help?", icon: "🤔" },
  ],
  [
    { text: "Prepare for upcoming test", icon: "📝" },
    { text: "Review past material", icon: "📚" },
    { text: "Create practice questions", icon: "❓" },
    { text: "Summarize the main ideas", icon: "📋" },
    { text: "Give me a challenge problem", icon: "🏆" },
    { text: "Compare and contrast", icon: "⚖️" },
    { text: "Visual explanation please", icon: "🎨" },
    { text: "How can I improve?", icon: "📈" },
  ]
];

const ChatModal = ({ circuit, isOpen, onClose }: ChatModalProps) => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSuggestionsOpen, setIsSuggestionsOpen] = useState(true);
  const inactivityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);

  const handleInteraction = () => {
    setLastActivity(Date.now());
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    startInactivityTimer();
  };

  const startInactivityTimer = () => {
    inactivityTimeoutRef.current = setTimeout(() => {
      if (circuit) {
        setChatHistory(prev => [...prev, {
          sender: circuit.teacher,
          message: "Tommy... just making sure you're still with me. Would you like me to give you some problems to work on that can help with our class material?"
        }]);
      }
    }, 120000); // 2 minutes
  };

  // Speech Recognition functions
  const startRecording = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }

    // @ts-ignore - webkitSpeechRecognition is not in the types
    const SpeechRecognition = window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;

    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsRecording(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setMessage(transcript);
      setIsRecording(false);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognition.start();
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }
  };

  const speakMessage = async (text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Text-to-speech is not supported in your browser.');
      return;
    }

    window.speechSynthesis.cancel();

    try {
      if (circuit?.teacherVoiceId) {
        const response = await fetch('/api/text-to-speech', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            voiceId: circuit.teacherVoiceId,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to generate speech with teacher\'s voice');
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        audio.onplay = () => setIsSpeaking(true);
        audio.onended = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };
        audio.onerror = () => {
          setIsSpeaking(false);
          URL.revokeObjectURL(audioUrl);
        };

        audio.play();
      } else {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
      }
    } catch (error) {
      console.error('Speech synthesis error:', error);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const handleSend = async (customMessage: string | null = null) => {
    const messageToSend = customMessage || message;
    if (messageToSend.trim() && circuit) {
      setChatHistory([...chatHistory, { sender: 'You', message: messageToSend.trim() }]);
      setMessage('');
      handleInteraction();

      // After first message, collapse the suggestions
      setIsSuggestionsOpen(false);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: messageToSend.trim(),
            circuitSettings: circuit.settings,
            subject: circuit.subject,
            grade: circuit.settings?.grade || 'K',
            stateStandards: circuit.settings?.stateStandards,
            teachingStyle: circuit.settings?.teachingStyle,
            learningObjectives: circuit.settings?.learningObjectives,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to get chat response');
        }

        const data = await response.json();
        const aiResponse = data.response;

        setChatHistory(prev => [...prev, {
          sender: circuit.teacher,
          message: aiResponse
        }]);

      } catch (error) {
        console.error('Chat error:', error);
        setChatHistory(prev => [...prev, {
          sender: circuit.teacher,
          message: "I'm sorry, I'm having trouble responding right now. Please try again."
        }]);
      }
    }
  };

  const ChatSuggestionRow = ({ suggestions, direction = 'left', speed = 40 }: {
    suggestions: Array<{ text: string, icon: string }>,
    direction?: 'left' | 'right',
    speed?: number
  }) => {
    const [duplicatedSuggestions] = useState(() => [...suggestions, ...suggestions]);

    return (
      <div className="relative w-full overflow-hidden py-2 group">
        <div
          className={`flex gap-4 ${
            direction === 'left' ? 'animate-scroll-left' : 'animate-scroll-right'
          } pause-animation`}
          style={{
            animationDuration: `${speed}s`
          }}
        >
          {duplicatedSuggestions.map((prompt, index) => (
            <button
              key={`${index}-${prompt.text}`}
              onClick={() => handleSend(prompt.text)}
              className="flex-shrink-0 flex items-center gap-2 px-5 py-3 bg-white rounded-xl border border-gray-200
                transition-all ease-in-out duration-300
                hover:bg-blue-50 hover:border-blue-300 hover:shadow-lg hover:scale-105
                relative whitespace-nowrap"
            >
              <div className="flex items-center gap-2 pr-8">
                <span className="text-xl">{prompt.icon}</span>
                <span className="text-base transition-colors duration-300 hover:text-blue-600">
                  {prompt.text}
                </span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  speakMessage(prompt.text);
                }}
                className="absolute right-2 p-2 rounded-full hover:bg-gray-100 transition-colors"
              >
                <Volume2 className="h-4 w-4 text-gray-600" />
              </button>
            </button>
          ))}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (circuit) {
      setChatHistory([
        {
          sender: circuit.teacher,
          message: "Hello Tommy! I'm here to help you with today's lesson, homework, or reviewing any material in the class. What can I help you with today?"
        }
      ]);
      handleInteraction();
    }
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
      stopSpeaking();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [circuit]);

  if (!isOpen || !circuit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className={`${circuit.bgColor} w-full max-w-2xl rounded-2xl shadow-xl max-h-[90vh] flex flex-col border border-gray-200`}>
        <div className="flex items-center justify-between border-b p-4 bg-white/80 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <circuit.Icon className={`h-8 w-8 ${circuit.accentColor}`} />
            <div>
              <h3 className="font-bold text-gray-900">{circuit.subject}</h3>
              <p className="text-sm text-gray-600">with {circuit.teacher}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex flex-col h-full overflow-hidden bg-white/40">
          <ScrollArea className="flex-1 px-4 overflow-y-auto">
            <div className="relative py-4 min-h-0">
              <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                <circuit.Icon className="w-96 h-96 transform -rotate-12" />
              </div>

              <div className="space-y-4 relative z-10">
                {chatHistory.map((chat, index) => (
                  <div
                    key={index}
                    className={`flex ${chat.sender === 'You' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 shadow-sm ${
                        chat.sender === 'You'
                          ? 'bg-blue-500 text-white'
                          : `${circuit.bgColor} border border-gray-200`
                      }`}
                    >
                      <p className="text-sm font-medium mb-1">{chat.sender}</p>
                      <p className="whitespace-pre-wrap">{chat.message}</p>
                      {chat.sender !== 'You' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-2"
                          onClick={() => isSpeaking ? stopSpeaking() : speakMessage(chat.message)}
                        >
                          {isSpeaking ? <StopCircle className="h-4 w-4 mr-2" /> : <Volume2 className="h-4 w-4 mr-2" />}
                          {isSpeaking ? 'Stop Reading' : 'Read Aloud'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>

          <div className="border-t mt-auto">
            <div className="px-6 py-3 bg-gray-50/80">
              <Collapsible
                open={isSuggestionsOpen}
                onOpenChange={setIsSuggestionsOpen}
              >
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between text-lg font-medium text-gray-700 hover:text-blue-600 transition-colors">
                      <span>Common things we can chat about</span>
                      <div className={`transform transition-transform ${isSuggestionsOpen ? 'rotate-180' : ''}`}>
                        <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-gray-600" />
                      </div>
                    </button>
                  </CollapsibleTrigger>
                </div>

                <CollapsibleContent>
                  <div className="mt-4">
                    <div className="space-y-4">
                      {CHAT_SUGGESTIONS.map((rowSuggestions, index) => (
                        <ChatSuggestionRow
                          key={index}
                          suggestions={rowSuggestions}
                          direction={index % 2 === 0 ? 'left' : 'right'}
                          speed={40 + (index * 10)}
                        />
                      ))}
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="border-t p-4 bg-white/80">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    handleInteraction();
                  }}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Ask about today's lesson or get homework help..."
                  className="flex-1 rounded-full border border-gray-200 px-4 py-2 focus:border-blue-500 focus:outline-none"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`rounded-full ${isRecording ? 'bg-red-100 text-red-600' : 'hover:bg-gray-100'}`}
                >
                  {isRecording ? <StopCircle className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </Button>
                <Button
                  onClick={() => handleSend()}
                  className={`rounded-full ${circuit.accentColor} p-2 text-white hover:opacity-90`}
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;