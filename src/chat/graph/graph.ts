import {
  MessagesAnnotation,
  StateGraph,
  START,
  END,
} from '@langchain/langgraph';

const _router = () => {
  return { messages: [{ role: 'ai', content: 'hello world' }] };
};

const graph = new StateGraph(MessagesAnnotation)
  .addNode('mock_llm', _router)
  .addEdge(START, 'mock_llm')
  .addEdge('mock_llm', END)
  .compile();

graph.invoke({ messages: [{ role: 'user', content: 'hi!' }] });
