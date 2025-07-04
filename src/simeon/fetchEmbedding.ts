import {requestUrl} from "obsidian";
import {OLLAMA_HOST, OLLAMA_MODEL} from "./constants";

export async function fetchEmbedding(text: string, isQuery = false): Promise<[number]> {
    const prefix: string = isQuery ? "search_query" : "search_document" + ": ";
    const prompt = prefix + text;

    const responseEmbedding = await requestUrl({
        url: `${OLLAMA_HOST}/api/embeddings`,
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: OLLAMA_MODEL,
            prompt: prompt
        })
    }).json;


    const embedding = responseEmbedding.embedding as [number];
    return embedding;
}
