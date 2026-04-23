export interface Prompt {
  id: number;
  text: string;
  category: 'gratitude' | 'reflection' | 'growth' | 'mindfulness' | 'goals' | 'relationships';
}

export const PROMPTS: Prompt[] = [
  // Gratitude
  { id: 1, text: "What are three things you're grateful for today?", category: 'gratitude' },
  { id: 2, text: "Who made a positive impact on your life recently?", category: 'gratitude' },
  { id: 3, text: "What small pleasure did you enjoy today?", category: 'gratitude' },
  { id: 4, text: "What's something you often take for granted?", category: 'gratitude' },
  { id: 5, text: "What ability or skill are you thankful to have?", category: 'gratitude' },
  // Reflection
  { id: 6, text: "What was the highlight of your day?", category: 'reflection' },
  { id: 7, text: "What's one thing you could have done better today?", category: 'reflection' },
  { id: 8, text: "What surprised you today?", category: 'reflection' },
  { id: 9, text: "What emotion dominated your day, and why?", category: 'reflection' },
  { id: 10, text: "If today had a title, what would it be?", category: 'reflection' },
  { id: 11, text: "What's something you learned today that you didn't know yesterday?", category: 'reflection' },
  // Growth
  { id: 12, text: "What's one habit you want to build this month?", category: 'growth' },
  { id: 13, text: "What fear is holding you back right now?", category: 'growth' },
  { id: 14, text: "What would your ideal day look like in 5 years?", category: 'growth' },
  { id: 15, text: "What's a mistake you made that taught you something valuable?", category: 'growth' },
  { id: 16, text: "What's one thing you can do tomorrow to improve your life by 1%?", category: 'growth' },
  { id: 17, text: "What skill do you wish you had, and what's stopping you from learning it?", category: 'growth' },
  // Mindfulness
  { id: 18, text: "How does your body feel right now? Scan from head to toe.", category: 'mindfulness' },
  { id: 19, text: "What sounds can you hear in this moment?", category: 'mindfulness' },
  { id: 20, text: "Describe your current mood in one word. Now expand on it.", category: 'mindfulness' },
  { id: 21, text: "What's weighing on your mind? Write it out to release it.", category: 'mindfulness' },
  { id: 22, text: "What brought you peace today?", category: 'mindfulness' },
  { id: 23, text: "When did you feel most present today?", category: 'mindfulness' },
  // Goals
  { id: 24, text: "What's your #1 priority this week?", category: 'goals' },
  { id: 25, text: "What progress did you make on your goals today?", category: 'goals' },
  { id: 26, text: "What's one thing you're procrastinating on? Why?", category: 'goals' },
  { id: 27, text: "What does success look like for you this month?", category: 'goals' },
  { id: 28, text: "What's one goal you've been avoiding? Be honest with yourself.", category: 'goals' },
  // Relationships
  { id: 29, text: "Who do you need to reach out to? Write them a mental letter.", category: 'relationships' },
  { id: 30, text: "What's a quality you admire in someone close to you?", category: 'relationships' },
  { id: 31, text: "How did you show kindness today?", category: 'relationships' },
  { id: 32, text: "Is there a conversation you've been avoiding? Why?", category: 'relationships' },
  { id: 33, text: "What's the best advice someone has given you recently?", category: 'relationships' },
];

export const PROMPT_CATEGORIES = ['gratitude', 'reflection', 'growth', 'mindfulness', 'goals', 'relationships'] as const;

export function getDailyPrompt(): Prompt {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return PROMPTS[dayOfYear % PROMPTS.length];
}

export function getRandomPrompt(category?: string): Prompt {
  const filtered = category ? PROMPTS.filter(p => p.category === category) : PROMPTS;
  return filtered[Math.floor(Math.random() * filtered.length)];
}
