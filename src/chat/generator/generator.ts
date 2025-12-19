import { ChatFireworks } from '@langchain/community/chat_models/fireworks';
import { PromptTemplate } from '@langchain/core/prompts';
import { Document } from 'langchain';
import { webFileEmbedding } from 'src/ingestion/ingestion.pipeline';
import { retriever } from 'src/ingestion/retriever';
import { formatDocumentsAsString } from '../util/document-utils';
import { reciprocalRankFusion } from '../util/RRF';
import { CHAT_FIREWORKS_API_KEY } from 'src/constansts/index.constants';

export const llm = new ChatFireworks({
  apiKey: CHAT_FIREWORKS_API_KEY,
  model: 'accounts/fireworks/models/deepseek-v3p1-terminus',
  temperature: 0.7,
});

const prompt = PromptTemplate.fromTemplate(
  'You are  assistant for question and answering task. Use the following pieces of retrieve context to answer the question. if you dont know the answer then say i dont know ans user three sentence maximum and keep the answer short and concise. Question: {question}\n\nContext: {context}//\n\nAnswer:',
);

export const runAgent = async () => {
  console.log('runAgent');
  await webFileEmbedding(
    "https://cdn.visionias.in/value_added_material/Climate_Change.pdf"
  );
  const context = await retriever('Climate Change');
  console.log('context', context);
  const promptVal = await prompt.invoke({
    question: 'what are the causes of climate change',
    context: context?.[0].pageContent,
  });
  console.log('promptVal', promptVal);
  const response = await llm.invoke([
    { role: 'user', content: promptVal.value },
  ]);
  console.log(response?.content);
  return response?.content as string;
};
;
