import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Annotation, END, Send, START, StateGraph } from "@langchain/langgraph";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { Document } from "langchain";
import { llm } from "src/chat/generator/generator";


export const generateSummary_1 = async () => {
    const loader = new CheerioWebBaseLoader("https://www.google.com");
    const docs = await loader.load();

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000, // Larger chunks provide more context
        chunkOverlap: 200, // 10-20% overlap is typical
    });


    const allSplits = await splitter.splitDocuments(docs);

    // Helper to estimate tokens
    function approximateTokenCount(text: string): number {
        return text.length / 4;
    }

    // Graph State
    const overAllState = Annotation.Root({
        contents: Annotation<string[]>,
        summaries: Annotation<string[]>({
            reducer: (state, update) => {
                return [...state, ...update];
            },
            default: () => [],
        }),
        collapsedSummaries: Annotation<Document[]>({
            reducer: (state, update) => update,
            default: () => [],
        }),
        finalSummary: Annotation<string>,
    })

    // 1. Map Step: Send each chunk to generateSummary
    const mapSummaries = async (state: typeof overAllState.State) => {
        return state.contents.map((content) => new Send("generateSummary", { content }));
    }

    interface SummaryState {
        content: string
    }

    // 2. Generate Summary Node
    const generateSummary = async (state: SummaryState) => {
        const mapPrompt = ChatPromptTemplate.fromMessages([
            ["user", "Write a concise summary of the following :\n\n {context}"],
        ])
        const prompt = await mapPrompt.invoke({ context: state.content })
        const response = await llm.invoke(prompt)
        return { summaries: [String(response.content)] }
    }

    // 3. Collect Summaries Node (This might be implicit in the reducer, but explicit node helps structure)
    const collectSummaries = async (
        state: typeof overAllState.State
    ) => {
        return {
            collapsedSummaries: state.summaries.map((summary) => new Document({ pageContent: summary })),
        }
    }

    // 4. Collapse Summary Node (if too large)
    const collapseSummary = async (
        state: typeof overAllState.State
    ) => {
        const docLists = state.collapsedSummaries;
        const split = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 200,
        });
        // We treat the summaries as documents and split them again if needed, 
        // but for "collapse" we usually want to summarize the summaries.
        // Simple approach: Join them and summarize.

        // If we have too many summaries, we might want to batch them. 
        // For simplicity here, let's just re-summarize the whole set of summaries.

        const mapPrompt = ChatPromptTemplate.fromMessages([
            ["user", "The following is a set of summaries:\n\n{context}\n\nTake these and distill it into a consolidated summary."],
        ])

        const combinedContent = docLists.map(d => d.pageContent).join("\n\n");
        const prompt = await mapPrompt.invoke({ context: combinedContent });
        const response = await llm.invoke(prompt);

        // We return this as a single document in collapsedSummaries to replace the list
        return {
            collapsedSummaries: [new Document({ pageContent: String(response.content) })]
        };
    }

    // 5. Final Summary Node
    const generateFinalSummary = async (
        state: typeof overAllState.State
    ) => {
        const reducePrompt = ChatPromptTemplate.fromMessages([
            ["user", "The following is a set of summaries : {doc} Take these and distill it into a final, consolidated summary of the main themes"],
        ])

        const combinedContent = state.collapsedSummaries.map(d => d.pageContent).join("\n\n");
        const prompt = await reducePrompt.invoke({ doc: combinedContent });
        const response = await llm.invoke(prompt);

        return { finalSummary: String(response.content) };
    }

    // Conditional Edge Logic
    const shouldCollapse = async (state: typeof overAllState.State) => {
        const tokenCount = state.collapsedSummaries.reduce((acc, doc) => acc + approximateTokenCount(doc.pageContent), 0);
        const maxToken = 3000; // Arbitrary limit for the final context window
        if (tokenCount > maxToken) {
            return "collapseSummary";
        }
        return "generateFinalSummary";
    }

    const graph = new StateGraph(overAllState)
        .addNode("generateSummary", generateSummary)
        .addNode("collectSummaries", collectSummaries)
        .addNode("collapseSummary", collapseSummary)
        .addNode("generateFinalSummary", generateFinalSummary)

        .addConditionalEdges(START, mapSummaries, ["generateSummary"])
        .addEdge("generateSummary", "collectSummaries")
        .addConditionalEdges("collectSummaries", shouldCollapse, ["collapseSummary", "generateFinalSummary"])
        .addConditionalEdges("collapseSummary", shouldCollapse, ["collapseSummary", "generateFinalSummary"])
        .addEdge("generateFinalSummary", END);

    const app = graph.compile()

    let finalSummary = null as any;

    console.log("Starting summary generation...");

    for await (const step of await app.stream({
        contents: allSplits.map((split) => split.pageContent),
    }, {
        recursionLimit: 10
    })) {
        console.log("Step:", Object.keys(step));
        if (step.hasOwnProperty("generateFinalSummary")) {
            finalSummary = step.generateFinalSummary;
        }
    }
    console.log("Final Summary:", finalSummary);
    return finalSummary;
}
