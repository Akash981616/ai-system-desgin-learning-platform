import { StateAnnotation } from 'src/ingestion/qa.overdoc';
import { z } from 'zod';
import zodToJsonSchema from 'zod-to-json-schema';

export const extractMsg = (
  state: typeof StateAnnotation.State,
  messageType: 'human' | 'ai',
) => {
  console.log('extractMsg', state);
  const lastHumanMsg = state.messages
    .filter((msg) => msg.getType() === messageType)
    .slice(-1)[0];
  console.log('lastHumanMsg', lastHumanMsg);
  if (!lastHumanMsg) {
    throw new Error(`No message of type '${messageType}' found in state.`);
  }
  return lastHumanMsg;
};
const stringArraySchema = z.array(z.string());

export const responseFormat = {
  response_format: {
    type: 'json_schema',
    json_schema: {
      name: 'StringArraySchema',
      schema: zodToJsonSchema(stringArraySchema).definitions?.StringArray || {
        type: 'array',
        items: { type: 'string' },
      },
    },
  },
};

const gradeDocSchema = z
  .object({
    binaryScore: z
      .enum(['yes', 'no'])
      .describe("Relevance score 'yes' or 'no'"),
  })
  .describe(
    'Grade the relevance of the retrieved document to the question. Either yes or no',
  );

// Clean the schema to remove fields that OpenAI doesn't accept
const cleanSchema = (schema: any) => {
  const { $schema, definitions, ...rest } = schema;
  return rest;
};

export const gradeDocFormatResponse = {
  response_format: {
    type: 'json_schema' as const,
    json_schema: {
      name: 'GradeDocumentSchema',
      schema: cleanSchema(zodToJsonSchema(gradeDocSchema)),
    },
  },
};
