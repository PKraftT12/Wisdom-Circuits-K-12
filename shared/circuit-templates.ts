export const TeachingStyle = {
  Socratic: "Socratic",
  Interactive: "Interactive",
  ProblemBased: "Problem-Based",
  Direct: "Direct",
  Discovery: "Discovery",
  Reflective: "Reflective"
} as const;

export const ResponseType = {
  Conceptual: "Conceptual",
  StepByStep: "Step-by-Step",
  Analytical: "Analytical",
  Progressive: "Progressive",
  OpenEnded: "Open-Ended"
} as const;

export const HomeworkPolicy = {
  GuideOnly: "Guide Only",
  ProvideExamples: "Provide Examples",
  ChallengeExtension: "Challenge Extension",
  StructuredPractice: "Structured Practice",
  ProjectBased: "Project-Based",
  SelfAssessment: "Self-Assessment"
} as const;

export type TeachingStyleType = typeof TeachingStyle[keyof typeof TeachingStyle];
export type ResponseTypeType = typeof ResponseType[keyof typeof ResponseType];
export type HomeworkPolicyType = typeof HomeworkPolicy[keyof typeof HomeworkPolicy];

export type TeachingTemplate = keyof typeof DEFAULT_TEACHING_PROMPTS;

export interface TeachingConfiguration {
  teachingStyle: TeachingStyleType;
  responseType: ResponseTypeType;
  homeworkPolicy: HomeworkPolicyType;
  conceptBreakdown: boolean;
  useExamples: boolean;
  difficultyAdaptation: boolean;
  encouragementFrequency: "Low" | "Medium" | "High";
  defaultPrompts: string[];
  customPrompts?: string[];
}

export const DEFAULT_TEACHING_PROMPTS = {
  conceptualUnderstanding: {
    name: "Conceptual Understanding Focus",
    description: "Emphasizes deep understanding of concepts through guided discovery and metacognition",
    configuration: {
      teachingStyle: TeachingStyle.Socratic,
      responseType: ResponseType.Conceptual,
      homeworkPolicy: HomeworkPolicy.GuideOnly,
      conceptBreakdown: true,
      useExamples: true,
      difficultyAdaptation: true,
      encouragementFrequency: "Medium",
      defaultPrompts: [
        "Can you explain the main concept in your own words?",
        "How does this concept connect to what you already know?",
        "What patterns or relationships do you notice?",
        "What might happen if we changed one part of this?",
        "Can you create an analogy for this concept?",
        "What evidence supports your thinking?",
      ]
    }
  },

  guidedPractice: {
    name: "Guided Practice Assistant",
    description: "Scaffolds learning through structured practice and immediate feedback",
    configuration: {
      teachingStyle: TeachingStyle.Interactive,
      responseType: ResponseType.StepByStep,
      homeworkPolicy: HomeworkPolicy.ProvideExamples,
      conceptBreakdown: true,
      useExamples: true,
      difficultyAdaptation: true,
      encouragementFrequency: "High",
      defaultPrompts: [
        "Let's break this down step by step. What's our first step?",
        "Can you identify any similar problems we've solved?",
        "What strategy would be most helpful here?",
        "How can we check if our approach is working?",
        "What's the next logical step?",
        "Let's verify each step as we go. Does this make sense?",
      ]
    }
  },

  criticalThinking: {
    name: "Critical Thinking Development",
    description: "Develops analytical and problem-solving skills through challenging scenarios",
    configuration: {
      teachingStyle: TeachingStyle.ProblemBased,
      responseType: ResponseType.Analytical,
      homeworkPolicy: HomeworkPolicy.ChallengeExtension,
      conceptBreakdown: true,
      useExamples: true,
      difficultyAdaptation: true,
      encouragementFrequency: "Medium",
      defaultPrompts: [
        "What are the key factors to consider in this situation?",
        "How might we approach this problem differently?",
        "What assumptions are we making?",
        "Can you evaluate the strengths and weaknesses of this approach?",
        "How could we test this solution?",
        "What evidence would change your conclusion?",
      ]
    }
  },

  skillMastery: {
    name: "Skill Mastery Track",
    description: "Focuses on systematic skill development and mastery through targeted practice",
    configuration: {
      teachingStyle: TeachingStyle.Direct,
      responseType: ResponseType.Progressive,
      homeworkPolicy: HomeworkPolicy.StructuredPractice,
      conceptBreakdown: true,
      useExamples: true,
      difficultyAdaptation: true,
      encouragementFrequency: "High",
      defaultPrompts: [
        "Let's practice this specific skill step by step",
        "Can you demonstrate this technique independently?",
        "How would you apply this skill in a different context?",
        "What aspects of this skill need more practice?",
        "Can you teach this skill to someone else?",
        "How does this skill connect to other things you've learned?",
      ]
    }
  },

  creativeExploration: {
    name: "Creative Exploration Mode",
    description: "Encourages creative thinking and innovative problem-solving approaches",
    configuration: {
      teachingStyle: TeachingStyle.Discovery,
      responseType: ResponseType.OpenEnded,
      homeworkPolicy: HomeworkPolicy.ProjectBased,
      conceptBreakdown: true,
      useExamples: true,
      difficultyAdaptation: true,
      encouragementFrequency: "High",
      defaultPrompts: [
        "What unique approach could we try here?",
        "How might we look at this from a different perspective?",
        "Can you create something new using these concepts?",
        "What possibilities haven't we considered yet?",
        "How could we combine different ideas to solve this?",
        "What would an innovative solution look like?",
      ]
    }
  },

  reflectiveLearning: {
    name: "Reflective Learning Process",
    description: "Promotes deep learning through structured reflection and metacognition",
    configuration: {
      teachingStyle: TeachingStyle.Reflective,
      responseType: ResponseType.Analytical,
      homeworkPolicy: HomeworkPolicy.SelfAssessment,
      conceptBreakdown: true,
      useExamples: true,
      difficultyAdaptation: true,
      encouragementFrequency: "Medium",
      defaultPrompts: [
        "What was your thought process during this task?",
        "How has your understanding changed?",
        "What strategies worked well for you?",
        "What would you do differently next time?",
        "How can you apply what you've learned?",
        "What questions do you still have?",
      ]
    }
  }
};