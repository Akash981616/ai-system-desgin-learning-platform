import { PineconeStore } from '@langchain/pinecone';
import { pineconeIndex } from 'src/chat/vectorStore/vector.db';
import { embeddings } from 'src/chat/embeddingModel/embedding.model';
import { CohereRerank } from '@langchain/cohere';
import { Pinecone as PineconeClient } from '@pinecone-database/pinecone';
import { COHERE_API_KEY, COHERE_RERANK_MODEL } from 'src/constansts/index.constants';

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
    const PINECONE_API_KEY =
      'pcsk_54yk2T_N9iDX6BUS9zoz4uQgaPWm5EaMpYZnmj17pudk3Fzf6PXFaQxeZhKJkRrQPF1LPw';
    const PINECONE_INDEX = 'llmnotbook';

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
    console.log('Rerank Model', COHERE_RERANK_MODEL);
    // console.log('result from queryVectorDB', result);
    const cohereReRanker = new CohereRerank({
      apiKey: COHERE_API_KEY,
      model: COHERE_RERANK_MODEL,
    });
    const rerankedResult = await cohereReRanker.rerank(result, query, {
      topN: 5
    });
    console.log('rerankedResult', rerankedResult);
    if (result.length > 0) {
      return [result[rerankedResult[0].index]];

    }
    return []
  } catch (error) {
    console.error('Error loading web file:', error);
  }
};




