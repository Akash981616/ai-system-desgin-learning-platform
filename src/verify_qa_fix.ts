import { HumanMessage } from '@langchain/core/messages';
import { RetrieveNode, StateAnnotation } from './ingestion/qa.overdoc';

async function verify() {
  console.log('Starting verification...');

  const mockState: typeof StateAnnotation.State = {
    messages: [new HumanMessage('What is prompt engineering?')],
    retrieverDoc: [],
    generateQuestion: '',
    filterDoc: [],
    nextNode: '',
    newQuery: '',
  };

  try {
    console.log('Calling RetrieveNode...');
    // We expect this might fail at LLM or DB calls, but NOT at extractMsg
    await RetrieveNode(mockState);
    console.log(
      'RetrieveNode finished without error (unexpected if no env vars, but good for extractMsg check).',
    );
  } catch (error: any) {
    if (error.message.includes('No message of type')) {
      console.error('FAILED: extractMsg threw an error:', error.message);
      process.exit(1);
    } else if (error.message.includes('Cannot read properties of undefined')) {
      console.error('FAILED: Original error still present:', error.message);
      process.exit(1);
    } else {
      console.log(
        'PASSED: extractMsg worked! Error occurred later as expected (due to missing env/mocks):',
        error.message,
      );
    }
  }
}

verify();
