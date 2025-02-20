import React, { useState } from 'react';
import { 
  BookOpen, 
  Calculator, 
  Beaker, 
  Globe2, 
  Pencil, 
  MessageSquare, 
  X, 
  Send, 
  LayoutGrid, 
  Binary,
  Image
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const CircuitCard = ({ circuit, onClick, index }) => (
  <Draggable draggableId={`circuit-${index}`} index={index}>
    {(provided, snapshot) => (
      <div
        ref={provided.innerRef}
        {...provided.draggableProps}
        {...provided.dragHandleProps}
        onClick={onClick}
        className={`${circuit.bgColor} aspect-square rounded-xl p-4 relative cursor-pointer 
          overflow-hidden transition-all duration-300 
          border border-gray-200 shadow-md
          hover:shadow-xl hover:scale-105 hover:bg-blue-50 hover:border-blue-300
          group ${snapshot.isDragging ? 'shadow-2xl scale-105' : ''}`}
      >
        {/* Large Background Icon */}
        <div className="absolute -bottom-4 -right-4 opacity-70 transition-transform duration-300 group-hover:scale-110">
          <circuit.Icon className={`w-40 h-40 ${circuit.iconColor}`} strokeWidth={1} />
        </div>

        {/* Content */}
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold uppercase tracking-wider ${circuit.accentColor}`}>
              {circuit.subject}
            </span>
          </div>

          <h2 className="text-xl font-bold text-gray-800 mt-4 tracking-tight group-hover:text-blue-600">
            {circuit.teacher}
          </h2>

          <p className="text-sm text-gray-600 mt-2">
            {circuit.description}
          </p>
        </div>
      </div>
    )}
  </Draggable>
);

const ChatModal = ({ circuit, isOpen, onClose }) => {
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const inactivityTimeoutRef = React.useRef(null);

  // Reset activity timer on any user interaction
  const resetActivityTimer = () => {
    setLastActivity(Date.now());
    if (inactivityTimeoutRef.current) {
      clearTimeout(inactivityTimeoutRef.current);
    }
    startInactivityTimer();
  };

  // Start inactivity timer
  const startInactivityTimer = () => {
    inactivityTimeoutRef.current = setTimeout(() => {
      // Add inactivity prompt to chat
      setChatHistory(prev => [...prev, {
        sender: circuit.teacher,
        message: "Tommy... just making sure you're still with me. Would you like me to give you some problems to work on that can help with our class material?"
      }]);
    }, 120000); // 2 minutes
  };

  // Initialize chat and timer when circuit changes
  React.useEffect(() => {
    if (circuit) {
      setChatHistory([
        { 
          sender: circuit.teacher, 
          message: "Hello Tommy! I'm here to help you with today's lesson, homework, or reviewing any material in the class. What can I help you with today?"
        }
      ]);
      resetActivityTimer();
    }
    return () => {
      if (inactivityTimeoutRef.current) {
        clearTimeout(inactivityTimeoutRef.current);
      }
    };
  }, [circuit]);

  const handleSend = (customMessage = null) => {
    const messageToSend = customMessage || message;
    if (messageToSend.trim()) {
      setChatHistory([...chatHistory, { sender: 'You', message: messageToSend.trim() }]);
      setMessage('');
      resetActivityTimer();
      
      setTimeout(() => {
        setChatHistory(prev => [...prev, {
          sender: circuit.teacher,
          message: "I'll help explain that using the same approach we covered in class. Let me break it down step by step..."
        }]);
      }, 1000);
    }
  };

  if (!isOpen || !circuit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className={`${circuit.bgColor} w-full max-w-2xl rounded-2xl shadow-xl`}>
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b p-4">
          <div className="flex items-center gap-3">
            <circuit.Icon className={`h-8 w-8 ${circuit.accentColor}`} />
            <div>
              <h3 className="font-bold">{circuit.subject}</h3>
              <p className="text-sm text-gray-600">with {circuit.teacher}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Chat Messages Area */}
        <div className="relative h-96 overflow-hidden">
          {/* Background Icon */}
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 opacity-5 pointer-events-none">
            <circuit.Icon className="w-96 h-96 transform -rotate-12" />
          </div>

          {/* Messages */}
          <div className="relative z-10 h-full overflow-y-auto p-4"
            onMouseMove={resetActivityTimer}
            onClick={resetActivityTimer}
            onKeyPress={resetActivityTimer}
          >
            {chatHistory.map((chat, index) => (
              <div 
                key={index}
                className={`mb-4 flex ${chat.sender === 'You' ? 'justify-end' : 'justify-start'}`}
              >
                <div 
                  className={`max-w-[80%] rounded-lg p-3 ${
                    chat.sender === 'You' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm font-medium">{chat.sender}</p>
                  <p>{chat.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Start Prompts */}
        <div className="border-t px-6 py-5 bg-gray-50">
          <p className="text-lg font-medium text-gray-700 mb-4">Common things we can chat about:</p>
          <div className="flex flex-wrap gap-3">
            {[
              { text: "I was absent. What did I miss?", icon: "🎯" },
              { text: "Review today's lesson", icon: "📚" },
              { text: "Help with homework", icon: "✏️" },
              { text: "I need extra practice", icon: "🎯" },
              { text: "Explain a concept", icon: "💡" },
              { text: "Check my work", icon: "✅" },
              { text: "Next test/quiz", icon: "📅" }
            ].map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleSend(prompt.text)}
                className="flex items-center gap-2 px-5 py-3 bg-white rounded-xl border border-gray-200
                  transition-all ease-in-out duration-300
                  hover:bg-blue-50 hover:border-blue-300 hover:shadow-lg hover:scale-105"
              >
                <span className="text-xl">{prompt.icon}</span>
                <span className="text-base transition-colors duration-300 hover:text-blue-600">
                  {prompt.text}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                resetActivityTimer();
              }}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about today's lesson or get homework help..."
              className="flex-1 rounded-full border px-4 py-2 focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={() => handleSend()}
              className="rounded-full bg-blue-500 p-2 text-white hover:bg-blue-600"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [selectedCircuit, setSelectedCircuit] = useState(null);
  const [circuits, setCircuits] = useState([
    {
      subject: "Advanced Mathematics",
      teacher: "Mrs. Johnson",
      description: "Algebra, Calculus, and Problem-Solving",
      Icon: Calculator,
      bgColor: "bg-violet-100",
      iconColor: "text-violet-200",
      accentColor: "text-violet-700",
    },
    {
      subject: "World History",
      teacher: "Mr. Patel",
      description: "Ancient Civilizations and Modern Events",
      Icon: Globe2,
      bgColor: "bg-yellow-100",
      iconColor: "text-yellow-200",
      accentColor: "text-yellow-700",
    },
    {
      subject: "English Literature",
      teacher: "Ms. Thompson",
      description: "Shakespeare and Contemporary Works",
      Icon: BookOpen,
      bgColor: "bg-blue-100",
      iconColor: "text-blue-200",
      accentColor: "text-blue-700",
    },
    {
      subject: "Chemistry",
      teacher: "Dr. Martinez",
      description: "Molecular Structure and Reactions",
      Icon: Beaker,
      bgColor: "bg-green-100",
      iconColor: "text-green-200",
      accentColor: "text-green-700",
    },
    {
      subject: "Creative Writing",
      teacher: "Mrs. Chen",
      description: "Storytelling and Poetry",
      Icon: Pencil,
      bgColor: "bg-orange-100",
      iconColor: "text-orange-200",
      accentColor: "text-orange-700",
    },
    {
      subject: "Language Arts",
      teacher: "Mr. Williams",
      description: "Grammar and Composition",
      Icon: MessageSquare,
      bgColor: "bg-red-100",
      iconColor: "text-red-200",
      accentColor: "text-red-700",
    },
    {
      subject: "Physical Science",
      teacher: "Ms. Rodriguez",
      description: "Physics and Earth Sciences",
      Icon: LayoutGrid,
      bgColor: "bg-teal-100",
      iconColor: "text-teal-200",
      accentColor: "text-teal-700",
    },
    {
      subject: "Computer Science",
      teacher: "Mr. Lee",
      description: "Programming and Digital Systems",
      Icon: Binary,
      bgColor: "bg-indigo-100",
      iconColor: "text-indigo-200",
      accentColor: "text-indigo-700",
    },
    {
      subject: "Art History",
      teacher: "Mrs. Foster",
      description: "Visual Arts Through the Ages",
      Icon: Image,
      bgColor: "bg-pink-100",
      iconColor: "text-pink-200",
      accentColor: "text-pink-700",
    }
  ]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(circuits);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setCircuits(items);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">WISDOM CIRCUIT</h1>
          </div>
          <p className="text-sm font-medium text-gray-600">Fueling Knowledge, Igniting Success.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Add a Wisdom Circuit</span>
            <div className="relative">
              <input
                type="text"
                placeholder="enter Wisdom Circuit code"
                className="pl-4 pr-10 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 
                  placeholder:text-gray-400 focus:outline-none focus:border-blue-400
                  w-64"
              />
              <button className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full 
                hover:bg-gray-100 transition-colors">
                <Send className="h-4 w-4 text-gray-400" />
              </button>
            </div>
          </div>
          <div className="h-10 w-10 rounded-full bg-gray-200">
            <img
              src="/api/placeholder/40/40"
              alt="Student avatar"
              className="h-full w-full rounded-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Circuits Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="circuits" direction="horizontal">
          {(provided) => (
            <div 
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-3 gap-6"
            >
              {circuits.map((circuit, index) => (
                <CircuitCard 
                  key={index}
                  circuit={circuit}
                  onClick={() => setSelectedCircuit(circuit)}
                  index={index}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Chat Modal */}
      <ChatModal 
        circuit={selectedCircuit}
        isOpen={!!selectedCircuit}
        onClose={() => setSelectedCircuit(null)}
      />

      {/* Footer */}
      <div className="mt-6 text-right text-xs font-medium text-gray-500">
        Powered by Ingio
      </div>
    </div>
  );
};

export default Dashboard;