import { generateSummary_1 } from "./summay";

async function main() {
    try {
        console.log("Running summary generation test...");
        const result = await generateSummary_1();
        console.log("Test completed successfully.");
        console.log("Result:", result);
    } catch (error) {
        console.error("Test failed:", error);
    }
}

main();
