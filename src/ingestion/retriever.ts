import { PineconeStore } from '@langchain/pinecone';
import { pineconeIndex } from 'src/chat/vectorStore/vector.db';
import { embeddings } from 'src/chat/embeddingModel/embedding.model';
import { CohereRerank } from '@langchain/cohere';
import { Pinecone as PineconeClient } from '@pinecone-database/pinecone';
import { COHERE_RERANK_MODEL, PINECONE_API_KEY, PINECONE_INDEX } from 'src/constansts/index.constants';

export const retriever = async (query: string) => {
  try {
    // const docs = pineconeIndex;
    const vectorStore = await PineconeStore.fromExistingIndex(embeddings, {
      pineconeIndex: pineconeIndex,
    });
    const result = await vectorStore.similaritySearch(query, 10);
    console.log('result from retriever', result);
    return result;
  } catch (error) {
    console.error('Error loading web file:', error);
  }
};

export const queryVectorDB = async (query: string) => {
  try {


    const pinecone = new PineconeClient({
      apiKey: PINECONE_API_KEY,
    });
    const pineconeIndex = pinecone.index(PINECONE_INDEX);
    const vectorStore = new PineconeStore(embeddings, {
      pineconeIndex: pineconeIndex,
      maxConcurrency: 5,
      maxRetries: 2,
    });
    const result = await vectorStore.similaritySearch(query, 10);
    // console.log('result from queryVectorDB', result);
    const cohereReRanker = new CohereRerank({
      apiKey: 'QZG2gox0yc5eECBXnxR0qKzyF4FNdx4JL4O3vz9L',
      model: COHERE_RERANK_MODEL,
    });
    const rerankedResult = await cohereReRanker.rerank(result, query, {
      topN: 5,
    });
    if (result.length > 0) {
      return [result[rerankedResult[0].index]];
    }
    return [];
  } catch (error) {
    console.error('Error loading web file:', error);
  }
};
