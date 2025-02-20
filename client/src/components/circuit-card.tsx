import { LucideIcon, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { WisdomCircuit } from "@shared/schema";

interface CircuitProps {
  circuit: WisdomCircuit;
  onClick: () => void;
  selected?: boolean;
}

const CircuitCard = ({ circuit, onClick, selected = false }: CircuitProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (circuit.code) {
      try {
        await navigator.clipboard.writeText(circuit.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl p-4 relative cursor-pointer 
        overflow-hidden transition-all duration-300 ease-in-out
        border shadow-sm hover:shadow-xl hover:scale-[1.02]
        ${selected ? 'ring-2 ring-primary border-primary/20' : 'border-gray-200/50 hover:border-primary/20'}
        group
      `}
    >
      <div className="relative z-10">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold uppercase tracking-wider text-primary">
            {circuit.name}
          </span>
          <span className="text-xs bg-gray-100 px-2 py-1 rounded">
            Grade {circuit.grade}
          </span>
        </div>

        {circuit.code && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs bg-gray-100 px-2 py-1 rounded">
              Circuit Code: {circuit.code}
            </span>
            <button
              onClick={handleCopyCode}
              className="p-1 hover:bg-gray-100 rounded-full transition-all duration-200"
            >
              {copied ? (
                <Check className="h-3 w-3 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 text-gray-500 hover:text-gray-700" />
              )}
            </button>
          </div>
        )}

        <h2 className="text-xl font-bold text-gray-800 mt-4 tracking-tight
          transition-all duration-300 ease-in-out group-hover:text-primary">
          {circuit.teacherName}
        </h2>

        <p className="text-sm text-gray-600 mt-2 line-clamp-3">
          {circuit.description}
        </p>
      </div>
    </div>
  );
};

export default CircuitCard;