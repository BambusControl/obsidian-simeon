import {EmbeddingStorage} from "./services/impl/embeddingStorage";
import {fetchEmbedding} from "./fetchEmbedding";
import type {FileEmbedding} from "../libraries/types/fileEmbedding";
import {cosineSimilarity} from "./cosineSimilarity";
import {readVaultFile} from "./readVaultFile";
import type {Vault} from "obsidian";
import type {SearchResult} from "./search_result";

interface QueryResult {
    fileEmbedding: FileEmbedding,
    similarity: number
}


export async function search_embedding_query(vault: Vault, embeddingStore: EmbeddingStorage, searchString: string): Promise<SearchResult[]> {
    const embeddingRequest = fetchEmbedding(searchString, true);
    const fileEmbeddings = await embeddingStore.getFileEmbeddings();

    if (fileEmbeddings.length === 0) {
        console.log("No embeddings found");
        return [];
    }

    const queryEmbedding = await embeddingRequest;

    const results: Array<QueryResult> = [];

    for (const fileEmbedding of fileEmbeddings) {
        const similarity = cosineSimilarity(queryEmbedding, fileEmbedding.chunk.content);
        results.push({
            fileEmbedding: fileEmbedding,
            similarity: similarity
        });
    }

    results.sort((a, b) => b.similarity - a.similarity);
    const topScores = results.slice(0, 10);

    const finalResults = [];

    for (const result of topScores) {
        const content = await readVaultFile(vault, result.fileEmbedding.filepath);
        const offset = 40

        const sliceStart = Math.max(0, result.fileEmbedding.chunk.start - offset)
        const sliceEnd = Math.min(content.length, result.fileEmbedding.chunk.end + offset)
        const slicedContent = content.slice(sliceStart, sliceEnd);

        const highlightStart = offset
        const highlighEnd = slicedContent.length - offset

        finalResults.push({
            filepath: result.fileEmbedding.filepath,
            score: result.similarity,
            content: slicedContent,
            chunkId: result.fileEmbedding.chunk.chunkNo,
            match: {
                from: result.fileEmbedding.chunk.start,
                to: result.fileEmbedding.chunk.end,
            },
            highlight: {
                from: highlightStart,
                to: highlighEnd,
            }
        } as SearchResult);
    }

    console.log({results: finalResults});
    return finalResults;
}
