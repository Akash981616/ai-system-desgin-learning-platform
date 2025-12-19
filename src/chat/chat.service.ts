import { Injectable } from '@nestjs/common';
import { ChatTogetherAI } from '@langchain/community/chat_models/togetherai';
import { PromptTemplate } from '@langchain/core/prompts';
import { multiplyTool } from 'src/tools/multiply.tool';
import { RunnableLambda } from '@langchain/core/runnables';
import { HumanMessage } from 'langchain';
import { webSearchTool } from 'src/tools/tavily.tool';

const API_KEY =
  '58eb68189572ae7ecc8b8cff6d527e9be13b4d16b305a0836e2bb5288f6e1ec3';
if (!API_KEY) {
  throw new Error('TOGETHER_API_KEY environment variable is not set');
}

const LLM_MODEL = 'meta-llama/Llama-3.3-70B-Instruct-Turbo-Free';
const llm = new ChatTogetherAI({ apiKey: API_KEY, model: LLM_MODEL });

@Injectable()
export class ChatService {
  async privateChat(): Promise<string | undefined> {
    // const result = await webFileEmbedding('https://www.antiersolutions.com/');

    const prompt = new PromptTemplate({
      template:
        'You are a professional Math Teacher and you are teaching a class of 10th grade students. {input}',
      inputVariables: ['input'],
    });

    const invokePrompt = await prompt.invoke({ input: 'why  2+2 == 4' });
    // const message = [
    //   new SystemMessage(
    //     'You are a professional Math Teacher and you are teaching a class of 10th grade students.',
    //   ),
    //   new HumanMessage('what is the value of 2+2'),
    // ];

    try {
      const response = await llm.invoke([
        { role: 'system', content: invokePrompt.value },
      ]);
      const chain = llm.bindTools([webSearchTool, multiplyTool]);
      const toolChain = RunnableLambda.from(async (userInput: string) => {
        const humanMsg = new HumanMessage(userInput);
        const aiMsg = await chain.invoke([
          { role: 'human', content: userInput },
          humanMsg,
        ]);

        return aiMsg.content;
      });
      console.log(await toolChain.invoke('why 2+2 == 4'));
      return response?.content as string;
      // const res = await webSearch('who is the pm of India');
      // console.log('res', res);
      // return 'res';
      // const response = await llm.invoke([
      //   { role: 'system', content: invokePrompt.value },
      // ]);
      // console.log(response?.content);
      // return response?.content as string;
    } catch (error) {
      console.error(
        'Chat error:',
        error instanceof Error ? error.message : error,
      );
      // Consider throwing or returning a default value
      throw error; // Re-throw to let the caller handle it
    }
  }
}
