import { tavily } from '@tavily/core';
import { tool } from 'langchain';
import z from 'zod';

export const TAVILY_API_KEY = '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';
export const tavilyClient = tavily({ apiKey: TAVILY_API_KEY });

export const webSearchTool = async (query: string) => {
  const response = await tavilyClient.search(query);
  return response;
};

export const tavalyTool = tool(
  async (query: string) => {
    const response = await tavilyClient.search(query);
    return response;
  },
  {
    name: 'tavily_search',
    description: 'search the web for information',
    schema: z.object({
      query: z.string().describe('query to search the web'),
    }),
  },
);
