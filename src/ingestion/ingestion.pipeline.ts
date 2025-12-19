import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import vectorStore from 'src/chat/vectorStore/vector.db';
import { PineconeStore } from '@langchain/pinecone';
import { Pinecone as PineconeClient } from '@pinecone-database/pinecone';
import { PINECONE_API_KEY, PINECONE_INDEX } from 'src/constansts/index.constants';
import { embeddings } from 'src/chat/embeddingModel/embedding.model';

export const webFileEmbedding = async (url: string) => {
  try {
    console.log('🚀 [webFileEmbedding] Starting web file embedding process');
    console.log('🔗 [webFileEmbedding] URL:', url);

    const loader = new CheerioWebBaseLoader(url);
    console.log('📄 [webFileEmbedding] Loading documents from URL...');
    const docs = await loader.load();
    console.log('✅ [webFileEmbedding] Documents loaded successfully. Count:', docs.length);
    console.log('📊 [webFileEmbedding] Total content length:', docs.reduce((acc, doc) => acc + doc.pageContent.length, 0), 'characters');

    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000, // Larger chunks provide more context
      chunkOverlap: 200, // 10-20% overlap is typical
    });
    console.log('✂️ [webFileEmbedding] Splitting documents (chunkSize: 1000, chunkOverlap: 200)...');
    const allSplits = await splitter.splitDocuments(docs);
    console.log('✅ [webFileEmbedding] Documents split successfully. Total chunks:', allSplits.length);
    console.log('📝 [webFileEmbedding] Sample chunk:', allSplits[0]?.pageContent.substring(0, 100) + '...');

    console.log('🔌 [webFileEmbedding] Initializing Pinecone client...');
    const pinecone = new PineconeClient({
      apiKey: PINECONE_API_KEY,
    });
    const pineconeIndex = pinecone.index(PINECONE_INDEX);
    console.log('✅ [webFileEmbedding] Pinecone index initialized:', PINECONE_INDEX);

    // Verify index exists and is ready
    console.log('🔍 [webFileEmbedding] Verifying Pinecone index exists and is ready...');
    try {
      const indexStats = await pineconeIndex.describeIndexStats();
      console.log('✅ [webFileEmbedding] Index stats:', JSON.stringify(indexStats, null, 2));
      console.log('📊 [webFileEmbedding] Current vector count in index:', indexStats.totalRecordCount || 0);
    } catch (indexError: any) {
      console.error('❌ [webFileEmbedding] Failed to connect to Pinecone index:', PINECONE_INDEX);
      console.error('🔴 [webFileEmbedding] Error:', indexError?.message);
      console.error('💡 [webFileEmbedding] Please verify:');
      console.error('   1. Index name is correct:', PINECONE_INDEX);
      console.error('   2. Index exists in your Pinecone dashboard');
      console.error('   3. API key has access to this index');
      throw new Error(`Pinecone index "${PINECONE_INDEX}" not accessible: ${indexError?.message}`);
    }

    console.log('🗄️ [webFileEmbedding] Creating vector store (maxConcurrency: 5, maxRetries: 2)...');
    const vectorStore = new PineconeStore(embeddings, {
      pineconeIndex: pineconeIndex,
      maxConcurrency: 5,
      maxRetries: 2,
    });

    console.log('💾 [webFileEmbedding] Adding documents to vector store...');
    console.log('⏱️ [webFileEmbedding] This may take several minutes for', allSplits.length, 'chunks');

    const startTime = Date.now();
    const results = await vectorStore.addDocuments(allSplits);
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`🎉 [webFileEmbedding] All documents added successfully to vector store in ${duration}s!`);
    console.log('📋 [webFileEmbedding] Total embeddings created:', results.length);
    return results;
  } catch (error) {
    console.error('❌ [webFileEmbedding] Error occurred during web file embedding');
    console.error('🔴 [webFileEmbedding] Error details:', error);
    console.error('🔴 [webFileEmbedding] Error message:', error?.message);
    console.error('🔴 [webFileEmbedding] Error stack:', error?.stack);
    throw error;
  }
};
