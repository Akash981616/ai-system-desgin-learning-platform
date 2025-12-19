import { CohereEmbeddings } from '@langchain/cohere';
import { COHERE_API_KEY, EMBEDDING_MODEL } from 'src/constansts/index.constants';

export const embeddings = new CohereEmbeddings({
  apiKey: COHERE_API_KEY,
  model: EMBEDDING_MODEL,
});
