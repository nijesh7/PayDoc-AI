import { AIProvider } from './aiProvider';
import { GeminiProvider } from './geminiProvider';

let activeProvider: AIProvider;

const providerType = process.env.AI_PROVIDER || 'gemini';

if (providerType === 'gemini') {
  activeProvider = new GeminiProvider();
} else {
  // Default to GeminiProvider
  activeProvider = new GeminiProvider();
}

export const aiProvider = activeProvider;
export * from './aiProvider';
