import { PineconeStore } from '@langchain/pinecone';
import { Pinecone as PineconeClient } from '@pinecone-database/pinecone';
import { embeddings } from '../embeddingModel/embedding.model';
import { PINECONE_API_KEY, PINECONE_INDEX } from 'src/constansts/index.constants';


const pinecone = new PineconeClient({
  apiKey: PINECONE_API_KEY,
});
export const pineconeIndex = pinecone.index(PINECONE_INDEX);
const vectorStore = new PineconeStore(embeddings, {
  pineconeIndex: pineconeIndex,
  maxConcurrency: 5,
  maxRetries: 2,
});
export default vectorStore;
