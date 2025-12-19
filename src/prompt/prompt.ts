import { PromptTemplate } from '@langchain/core/prompts';

export const generate_question_prompt = PromptTemplate.fromTemplate(
  `You are an AI search assistant. 
  The User asked: {question}
  Step back and consider this question more broadly
  1. Reframe it in general terms.
  2. Identify main themes or dimensions involved.
  3. Generate 5 diverse search queries that cover these dimensions ensuring query explores a different perspective or phrasing.
  
  Return your response as a JSON object with a "queries" field containing an array of strings.
  Example format: {{"queries": ["query 1", "query 2", "query 3", "query 4", "query 5"]}}
  `,
);

export const response_gen_prompt =
  PromptTemplate.fromTemplate(`You are a thought step-beck Research Assistant . 
  The User asked: {original_question}
  We expand this into serval related queries to cover different perspectives : {questions}

  We retrieve the following documents based on these queries :  {retrieved_documents}
  Your task:
  1.Step back and consider the original question  in a broad, general sense.
  2.Review the retrieved information across all queries and 
  try to answer the original question.
  3.Synthesize a signle, coherent answer that directly addresses the user's original question.
  4.If different queries highlight different aspects, integrate them into into  one clear explanation.
  5.Be concise, structured ,and clear.When useful cite or reference the source of the information.

  `);

export const grade_doc_prompt =
  PromptTemplate.fromTemplate(`You are a grader assessing relevance of a retrieved document to user question
  Here is the retrieval documents:
  {context}
  Here is the user question:{question}
  
  If the document contains keyword(s) or semantic meaning related to the user question, assign a Grade "yes" or 'no' to indicate whether the document is relevant or not.
  
  `);
export const transform_query_prompt =
  PromptTemplate.fromTemplate(`You are a generating question that is well optimzed for semantic search retrieval. 
  Lok at the input and try to reason about the underlying meaning and intent of the question.
  Here is the initial question:
  \n --- \n
  {question}
  \n --- \n
  
Formulate an improved question:`);
