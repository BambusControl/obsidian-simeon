import {EmbeddingStorage} from "./services/impl/embeddingStorage";
import {fetchEmbedding} from "./fetchEmbedding";
import type {FileEmbedding} from "../libraries/types/fileEmbedding";
import {cosineSimilarity} from "./cosineSimilarity";
import {readVaultFile} from "./readVaultFile";
import type {Vault} from "obsidian";

interface QueryResult {
    fileEmbedding: FileEmbedding,
    similarity: number
}


type SearchResult = {
    filepath: string;
    score: number;
    text: string
    start: number;
    end: number;
};

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
        //const slicedContent = content.slice(result.fileEmbedding.chunk.start, result.fileEmbedding.chunk.end);

        //const start = result.fileEmbedding.chunk.start + result.fileEmbedding.chunk.overlap;
        //const end = result.fileEmbedding.chunk.end - result.fileEmbedding.chunk.overlap;


        finalResults.push({
            filepath: result.fileEmbedding.filepath,
            score: result.similarity,
            text: content,
            start: result.fileEmbedding.chunk.start,
            end: result.fileEmbedding.chunk.end,
        } as SearchResult);
    }

    console.log({results: finalResults});
    return finalResults;
}
