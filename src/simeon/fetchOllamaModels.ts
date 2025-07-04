import {requestUrl} from "obsidian";
import {OLLAMA_HOST} from "./constants";

async function fetchOllamaModels(): Promise<void> {
    const responseModels = await requestUrl({
        url: `${OLLAMA_HOST}/api/tags`,
        method: "GET",
    }).json;

    console.log(responseModels.models);
}
