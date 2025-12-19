import { Document, DocumentInterface } from '@langchain/core/documents';

import {
  Annotation,
  END,
  MessagesAnnotation,
  START,
  StateGraph,
} from '@langchain/langgraph';
import { llm } from 'src/chat/generator/generator';
import { extractMsg, gradeDocFormatResponse } from 'src/chat/util';
import { reciprocalRankFusion } from 'src/chat/util/RRF';
import {
  generate_question_prompt,
  grade_doc_prompt,
  transform_query_prompt,
} from 'src/prompt/prompt';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { formatDocumentsAsString } from 'src/chat/util/document-utils';
import { tavilyClient } from 'src/tools/tavily.tool';
import { queryVectorDB } from './retriever';

export const StateAnnotation = Annotation.Root({
  ...MessagesAnnotation.spec,
  nextNode: Annotation<string>({
    reducer: (prev, next) => prev ?? next ?? '',
  }),
  newQuery: Annotation<string>({
    reducer: (prev, next) => prev ?? next ?? '',
  }),
  retrieverDoc: Annotation<DocumentInterface[]>({
    default: () => [],
    reducer: (prev, next) => prev.concat(next),
  }),
  generateQuestion: Annotation<string>({
    default: () => '',
    reducer: (prev, next) => prev ?? next ?? '',
  }),
  filterDoc: Annotation<DocumentInterface[]>({
    default: () => [],
    reducer: (prev, next) => prev.concat(next),
  }),
});
export const RetrieveNode = async (state: typeof StateAnnotation.State) => {
  console.log('🚀 Starting RetrieveNode');
  const lastMsg = extractMsg(state, 'human');
  const query = lastMsg.content;
  const generateQuestionPrompt = await generate_question_prompt.invoke({
    question: query,
  });
  console.log('❓ Generated Question Prompt:', generateQuestionPrompt);

  // Fireworks AI doesn't support strict json_schema like OpenAI
  // Use json_object mode instead and rely on prompt instructions
  const llmResult = await llm.invoke(
    [{ role: 'user', content: generateQuestionPrompt.value }],
    {
      response_format: {
        type: 'json_object',
      },
    },
  );
  console.log('🤖 LLM Result (RetrieveNode):', llmResult.content);

  let parsedResult: any;
  try {
    parsedResult = JSON.parse(llmResult?.content as string);
    console.log('✅ Parsed Questions:', parsedResult);
  } catch (error) {
    console.error('❌ Failed to parse JSON response:', error);
    console.error('Raw response:', llmResult?.content);
    throw new Error('Failed to parse LLM response as JSON');
  }

  // Extract queries, handling different possible response formats
  let questions: string[];
  if (parsedResult.queries && Array.isArray(parsedResult.queries)) {
    questions = parsedResult.queries;
  } else if (Array.isArray(parsedResult)) {
    questions = parsedResult;
  } else {
    console.error('Unexpected response format:', parsedResult);
    throw new Error('LLM response does not contain a queries array');
  }
  console.log('❓ Questions Array:', questions);
  const allRetrievedDoc = [] as DocumentInterface<Record<string, any>>[];

  for (const question of questions) {
    console.log('🔍 Querying Vector DB for:', question);
    const context = await queryVectorDB(question);
    allRetrievedDoc.push(
      ...(context as DocumentInterface<Record<string, any>>[]),
    );
  }
  console.log('📄 All Retrieved Docs:', allRetrievedDoc);
  return {
    retrieverDoc: allRetrievedDoc,
  };
};

export const fusedDoc = async (state: typeof StateAnnotation.State) => {
  console.log('🚀 Starting fusedDoc');
  const lastMsg = extractMsg(state, 'human');
  const query = lastMsg.content;
  const generateQuestionPrompt = await generate_question_prompt.invoke({
    question: query,
  });
  console.log('❓ Generated Question Prompt (fusedDoc):', generateQuestionPrompt);

  // Fireworks AI doesn't support strict json_schema like OpenAI
  // Use json_object mode instead and rely on prompt instructions
  const llmResult = await llm.invoke(
    [{ role: 'user', content: generateQuestionPrompt.value }],
    {
      response_format: {
        type: 'json_object',
      },
    },
  );
  console.log('🤖 LLM Result (fusedDoc):', llmResult);

  let parsedResult: any;
  try {
    parsedResult = JSON.parse(llmResult?.content as string);
    console.log('✅ Parsed Questions (fusedDoc):', parsedResult);
  } catch (error) {
    console.error('❌ Failed to parse JSON response:', error);
    console.error('Raw response:', llmResult?.content);
    throw new Error('Failed to parse LLM response as JSON');
  }

  // Extract queries, handling different possible response formats
  let questions: string[];
  if (parsedResult.queries && Array.isArray(parsedResult.queries)) {
    questions = parsedResult.queries;
  } else if (Array.isArray(parsedResult)) {
    questions = parsedResult;
  } else {
    console.error('Unexpected response format:', parsedResult);
    throw new Error('LLM response does not contain a queries array');
  }
  console.log('❓ Questions Array (fusedDoc):', questions);
  const allRetrievedDoc = [] as DocumentInterface<Record<string, any>>[][];

  for (const question of questions) {
    console.log('🔍 Querying Vector DB for (fusedDoc):', question);
    const context = await queryVectorDB(question);
    allRetrievedDoc.push(context as DocumentInterface<Record<string, any>>[]);
  }
  const fusedResults = reciprocalRankFusion(allRetrievedDoc as Document[][]);
  console.log('🔗 Fused Results:', fusedResults);
  const sortedDocs = fusedResults
    .map((result) => result.doc)
    .filter((doc) => doc !== undefined) as DocumentInterface[];
  console.log('📄 Sorted Docs:', sortedDocs);
  return {
    retrieverDoc: sortedDocs,
  };
};

export const gradeDocNode = async (state: typeof StateAnnotation.State) => {
  console.log('🚀 Starting gradeDocNode');
  const lastMsg = extractMsg(state, 'human');
  const allRetrievedDoc = state.retrieverDoc;
  const allFilterDoc = [] as Document[];

  for (const doc of allRetrievedDoc) {
    console.log('📝 Grading Document:', doc.pageContent.substring(0, 50) + '...');

    const prompt = await grade_doc_prompt.invoke({
      question: lastMsg.content,
      context: doc.pageContent,
    });

    const chainedResult = await llm.invoke(
      [{ role: 'user', content: prompt.value }],
      gradeDocFormatResponse,
    );

    console.log('🎓 Raw Grade Result:', chainedResult?.content);

    let binaryScore: 'yes' | 'no';
    try {
      const parsedResult = JSON.parse(chainedResult?.content as string);
      binaryScore = parsedResult;
      console.log('🎓 Parsed Grade Result:', binaryScore);
    } catch (error) {
      console.error('❌ Error parsing grade result:', error);
      console.error('Raw content:', chainedResult?.content);
      // Default to 'no' if parsing fails
      binaryScore = 'no';
    }

    if (binaryScore === 'yes') {
      doc.metadata.grade = 'yes';
      allFilterDoc.push(new Document({ pageContent: doc.pageContent }));
    }
  }
  console.log('✅ Filtered Docs:', allFilterDoc);
  return {
    filterDoc: allFilterDoc,
  };
};
export const transformQuery = async (state: typeof StateAnnotation.State) => {
  console.log('🚀 Starting transformQuery');
  const lastMsg = extractMsg(state, 'human');

  const questionSchema = z.object({
    question: z.string().describe('transformed question optimized for search'),
  });

  const prompt = await transform_query_prompt.invoke({
    question: lastMsg.content,
  });
  console.log('❓ Transform Query Prompt:', prompt);

  const betterQuestions = await llm.invoke(
    [{ role: 'user', content: prompt.value }],
    {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'TransformedQuestion',
          schema: zodToJsonSchema(questionSchema),
        },
      },
    },
  );

  console.log('🤖 Better Questions LLM Result:', betterQuestions);

  // Parse the JSON response
  let newQuery: string;
  try {
    const content = typeof betterQuestions?.content === 'string'
      ? betterQuestions.content
      : JSON.stringify(betterQuestions?.content);
    const parsedResult = JSON.parse(content);
    // Check if it's an object with a question field or a plain string
    if (typeof parsedResult === 'object' && parsedResult.question) {
      newQuery = parsedResult.question;
    } else if (typeof parsedResult === 'string') {
      newQuery = parsedResult;
    } else {
      // Fallback to original question if parsing fails
      newQuery = typeof lastMsg.content === 'string' ? lastMsg.content : String(lastMsg.content);
    }
  } catch (error) {
    console.error('❌ Error parsing LLM response:', error);
    // Fallback to the raw content or original question
    const fallbackContent = typeof betterQuestions?.content === 'string'
      ? betterQuestions.content
      : String(betterQuestions?.content || '');
    newQuery = fallbackContent || (typeof lastMsg.content === 'string' ? lastMsg.content : String(lastMsg.content));
  }

  console.log('✨ New Query:', newQuery);

  return {
    newQuery: newQuery,
  };
};
export const webSearch = async (state: typeof StateAnnotation.State) => {
  console.log('🚀 Starting webSearch');
  console.log('🌐 Querying Tavily Search:', state.newQuery);

  // Directly call tavilyClient.search with the query string
  const searchResults = await tavilyClient.search(state.newQuery);

  console.log('🌐 Search Results:', searchResults);
  const docs = searchResults.results.map((result) => {
    const doc = new Document({
      pageContent: result.content,
      metadata: {
        source: 'tavily_search',
        query: state.newQuery,
      },
    });
    return doc;
  });

  console.log('📄 Web Search Docs:', docs);
  return {
    retrieverDoc: docs,
  };
};

export const generate = async (state: typeof StateAnnotation.State) => {
  console.log('🚀 Starting generate');
  const lastMsg = extractMsg(state, 'human');

  const docToString = formatDocumentsAsString(state.retrieverDoc);
  console.log('📄 Doc to String:', docToString);
  console.log('📄 Last Msg:', lastMsg.content);
  console.log('📄 Generate Question:', state.generateQuestion);
  const generatePrompt = await generate_question_prompt.invoke({
    question: lastMsg.content,
    original: state.generateQuestion,
    context: docToString,
  });
  // console.log('❓ Generate Prompt:', generatePrompt);

  const answerSchema = z.object({
    answer: z.string().describe('generated answer based on context'),
  });

  const aiResponse = await llm.invoke(
    [{ role: 'user', content: generatePrompt.value }],
    {
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'GeneratedAnswer',
          schema: zodToJsonSchema(answerSchema),
        },
      },
    },
  );
  console.log('🤖Final AI Response:', aiResponse.content);
  return {
    messages: [aiResponse],
  };
};

const router = (state: typeof StateAnnotation.State) => {
  const filterDoc = state.filterDoc;
  console.log('🚦 Router Checking Filtered Docs Length:', filterDoc.length);
  if (filterDoc.length === 0) {
    console.log('👉 Routing to: TransformNode');
    return 'TransformNode';
  }
  console.log('👉 Routing to: generateNode');
  return 'generateNode';
};

const builder = new StateGraph(StateAnnotation)
  .addNode('RetrieveNode', RetrieveNode)
  .addNode('GradeNode', gradeDocNode)
  .addNode('generateNode', generate)
  .addNode('TransformNode', transformQuery)
  .addNode('webSearch', webSearch);

builder.addEdge(START, 'RetrieveNode');
builder.addEdge('RetrieveNode', 'GradeNode');
builder.addConditionalEdges('GradeNode', router);
builder.addEdge('TransformNode', 'webSearch');
builder.addEdge('webSearch', 'generateNode');
builder.addEdge('generateNode', END);

export const qaGraph = builder.compile();
