import {EmbeddingStorage} from "./services/impl/embeddingStorage";
import {fetchEmbedding} from "./fetchEmbedding";
import type {FileEmbedding} from "../libraries/types/fileEmbedding";
import {cosineSimilarity} from "./cosineSimilarity";
import {readVaultFile} from "./readVaultFile";
import type {Vault} from "obsidian";
import type {SearchResult} from "./search_result";
import {SimeonError} from "./errors/simeonError";

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
        const file = vault.getFileByPath(result.fileEmbedding.filepath);

        if (file == null) {
            throw new SimeonError(`File not found: ${result.fileEmbedding.filepath}`);
        }

        const content = await vault.cachedRead(file);

        const offset = 40

        const sliceStart = Math.max(0, result.fileEmbedding.chunk.range.from - offset)
        const sliceEnd = Math.min(content.length, result.fileEmbedding.chunk.range.to + offset)
        const slicedContent = content.slice(sliceStart, sliceEnd);

        const highlightStart = offset
        const highlightEnd = slicedContent.length - offset

        finalResults.push({
            filepath: result.fileEmbedding.filepath,
            score: result.similarity,
            content: slicedContent,
            chunkId: result.fileEmbedding.chunk.chunkNo,
            match: {
                from: result.fileEmbedding.chunk.range.from,
                to: result.fileEmbedding.chunk.range.to,
            },
            highlight: {
                from: highlightStart,
                to: highlightEnd,
            }
        } as SearchResult);
    }

    console.log({results: finalResults});
    return finalResults;
}
