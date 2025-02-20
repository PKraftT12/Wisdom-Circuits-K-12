import {
  BookOpen,
  Calculator,
  Beaker,
  Globe2,
  Pencil,
  MessageSquare,
  Binary,
  Image,
  Music,
  Brain,
  Dumbbell,
  Users,
  Laptop,
  FlaskConical,
  Languages,
  History,
  Palette,
  TreePine,
  Building2,
  Scale,
  Ruler,
  School,
  BookMarked,
  GraduationCap,
  LucideIcon,
  Blocks,
  Compass,
  type Icon
} from 'lucide-react';

interface IconMapping {
  icon: LucideIcon;
  keywords: string[];
  priority?: number; // Higher number means higher priority
}

const iconMappings: IconMapping[] = [
  {
    icon: Calculator,
    keywords: ['math', 'algebra', 'calculus', 'geometry', 'statistics', 'trigonometry', 'mathematics', 'arithmetic', 'numbers'],
    priority: 2
  },
  {
    icon: Building2,
    keywords: ['architecture', 'building', 'construction', 'design', 'structural', 'architectural', 'blueprint', 'infrastructure'],
    priority: 3
  },
  {
    icon: Beaker,
    keywords: ['chemistry', 'chemical', 'reaction', 'molecule', 'compound', 'solutions', 'laboratory'],
    priority: 2
  },
  {
    icon: FlaskConical,
    keywords: ['science', 'experiment', 'lab', 'research', 'scientific', 'testing'],
    priority: 1
  },
  {
    icon: Brain,
    keywords: ['biology', 'anatomy', 'physiology', 'neuroscience', 'cognitive', 'psychology', 'behavior', 'mind', 'mental', 'neural'],
    priority: 2
  },
  {
    icon: Globe2,
    keywords: ['geography', 'world', 'earth', 'global', 'maps', 'culture', 'countries', 'international', 'environmental'],
    priority: 2
  },
  {
    icon: History,
    keywords: ['history', 'civilization', 'ancient', 'modern', 'past', 'era', 'historical', 'century', 'period', 'timeline'],
    priority: 2
  },
  {
    icon: Pencil,
    keywords: ['writing', 'essay', 'composition', 'creative', 'poetry', 'literature', 'author', 'story'],
    priority: 2
  },
  {
    icon: MessageSquare,
    keywords: ['language', 'english', 'speech', 'communication', 'grammar', 'vocabulary', 'linguistics'],
    priority: 2
  },
  {
    icon: Binary,
    keywords: ['computer', 'programming', 'coding', 'software', 'development', 'tech', 'algorithm', 'data'],
    priority: 2
  },
  {
    icon: Palette,
    keywords: ['art', 'design', 'visual', 'drawing', 'painting', 'photography', 'creative', 'artistic', 'illustration'],
    priority: 2
  },
  {
    icon: Music,
    keywords: ['music', 'band', 'orchestra', 'instrumental', 'choir', 'song', 'musical', 'rhythm', 'harmony'],
    priority: 2
  },
  {
    icon: Languages,
    keywords: ['spanish', 'french', 'german', 'chinese', 'japanese', 'foreign', 'language', 'multilingual'],
    priority: 2
  },
  {
    icon: TreePine,
    keywords: ['environment', 'nature', 'ecology', 'biology', 'life', 'ecosystem', 'botanical', 'plant'],
    priority: 2
  },
  {
    icon: Scale,
    keywords: ['law', 'justice', 'legal', 'government', 'politics', 'civic', 'rights'],
    priority: 2
  },
  {
    icon: Compass,
    keywords: ['engineering', 'mechanical', 'civil', 'design', 'technical', 'drafting'],
    priority: 2
  },
  {
    icon: GraduationCap,
    keywords: ['education', 'academic', 'study', 'course', 'degree', 'university', 'college'],
    priority: 1
  },
  {
    icon: Blocks,
    keywords: ['elementary', 'basic', 'fundamental', 'introduction', 'beginner'],
    priority: 1
  },
  // Default fallback with lowest priority
  {
    icon: BookOpen,
    keywords: ['study', 'learn', 'education', 'course', 'class', 'teach', 'lesson'],
    priority: 0
  }
];

export function findBestMatchingIcon(text: string): LucideIcon {
  const normalizedText = text.toLowerCase();

  // Calculate scores for each icon mapping based on keyword matches
  // and multiply by priority factor
  const scores = iconMappings.map(mapping => ({
    icon: mapping.icon,
    score: mapping.keywords.reduce((score, keyword) => {
      const matches = (normalizedText.match(new RegExp(keyword, 'g')) || []).length;
      return score + matches * (mapping.priority || 1);
    }, 0)
  }));

  // Sort by score in descending order
  scores.sort((a, b) => b.score - a.score);

  // Return the icon with the highest score, or BookOpen as default
  return scores[0].score > 0 ? scores[0].icon : BookOpen;
}

export function getRandomAccentColor(): { bgColor: string; iconColor: string; accentColor: string } {
  const colors = [
    { bgColor: 'bg-violet-100', iconColor: 'text-violet-200', accentColor: 'text-violet-700' },
    { bgColor: 'bg-blue-100', iconColor: 'text-blue-200', accentColor: 'text-blue-700' },
    { bgColor: 'bg-green-100', iconColor: 'text-green-200', accentColor: 'text-green-700' },
    { bgColor: 'bg-yellow-100', iconColor: 'text-yellow-200', accentColor: 'text-yellow-700' },
    { bgColor: 'bg-orange-100', iconColor: 'text-orange-200', accentColor: 'text-orange-700' },
    { bgColor: 'bg-red-100', iconColor: 'text-red-200', accentColor: 'text-red-700' },
    { bgColor: 'bg-pink-100', iconColor: 'text-pink-200', accentColor: 'text-pink-700' },
    { bgColor: 'bg-indigo-100', iconColor: 'text-indigo-200', accentColor: 'text-indigo-700' },
    { bgColor: 'bg-teal-100', iconColor: 'text-teal-200', accentColor: 'text-teal-700' },
  ];

  return colors[Math.floor(Math.random() * colors.length)];
}