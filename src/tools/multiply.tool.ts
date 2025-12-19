import { tool } from 'langchain';
import * as z from 'zod';
export const multiplyTool = tool(({ a, b }) => a * b, {
  name: 'multiply',
  description: 'multiply two numbers',
  schema: z.object({
    a: z.number().describe('first number'),
    b: z.number().describe('second number'),
  }),
});
