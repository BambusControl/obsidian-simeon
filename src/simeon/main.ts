import {App, normalizePath, Plugin, PluginManifest, requestUrl, Vault} from "obsidian";
import {SettingTab} from "./components/settingTab";
import {RootPluginDataStorage} from "./services/impl/rootPluginDataStorage";
import {NewDataInitializer} from "./services/impl/newDataInitializer";
import {FileEmbedding} from "../libraries/types/fileEmbedding";
import {Chunk} from "../libraries/types/chunk";
import {EmbeddingStorage} from "./services/impl/embeddingStorage";
import {Arr} from "tern";


const OLLAMA_HOST = "http://niks.local:13000";
const OLLAMA_MODEL = "nomic-embed-text:latest";
const CHUNK_SIZE = 400;
const CHUNK_OVERLAP = 200;

/* Used by Obsidian */
async function fetchOllamaModels(): Promise<void> {
    const responseModels = await requestUrl({
        url: `${OLLAMA_HOST}/api/tags`,
        method: "GET",
    }).json;

    console.log(responseModels.models);
}

async function fetchEmbedding(text: string, isQuery = false): Promise<[number]> {
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

function* splitIntoChunks(content: string): Generator<Chunk<string>, number, void> {
    let chunkCount = 0;

    for (let i = 0; i < content.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
        const slicedString = content.slice(i, i + CHUNK_SIZE);

        yield {
            chunkNo: chunkCount,
            start: i,
            end: i + CHUNK_SIZE,
            content: slicedString
        } as Chunk<string>;

        chunkCount++;
    }

    return chunkCount;
}

export function cosineSimilarity(vec1: number[], vec2: number[]): number {
    const dotProduct = vec1.reduce((acc, val, i) => acc + val * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((acc, val) => acc + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((acc, val) => acc + val * val, 0));
    return dotProduct / (mag1 * mag2);
}

async function readVaultFile(vault: Vault, filepath: string): Promise<string> {
    const file = vault.getFileByPath(filepath);

    if (file == null) {
        return "";
    }

    return await vault.cachedRead(file);
}

// noinspection JSUnusedGlobalSymbols
export default class SimeonPlugin extends Plugin {

    constructor(
        app: App,
        manifest: PluginManifest,
    ) {
        super(app, manifest);
    }

    override async onload(): Promise<void> {
        console.group("Loading Simeon plugin");
        console.time("Plugin load time");

        console.info("Creating services");

        const dataStore = new RootPluginDataStorage(this);
        const initializer = new NewDataInitializer(dataStore);
        const embeddingStore = new EmbeddingStorage(dataStore);

        await initializer.initializeData();

        console.info("Adding UI elements");

        this.addSettingTab(new SettingTab(
            this.app,
            this,
        ));

        this.addCommand({
            id: "search",
            name: "Search",
            callback: async () => {
                const searchString: string = "Sharing knowledge is the economic engine of human progress";
                console.group("Searching");

                const embeddingRequest = fetchEmbedding(searchString, true);
                const fileEmbeddings = await embeddingStore.getFileEmbeddings();

                if (fileEmbeddings.length === 0) {
                    console.log("No embeddings found");
                    return;
                }

                const queryEmbedding = await embeddingRequest;

                const results: Array<{ fileEmbedding: FileEmbedding, similarity: number }> = [];

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
                    const content = await readVaultFile(this.app.vault, result.fileEmbedding.filepath);
                    const slicedContent = content.slice(result.fileEmbedding.chunk.start, result.fileEmbedding.chunk.end);

                    finalResults.push({
                        filepath: result.fileEmbedding.filepath,
                        score: result.similarity,
                        text: slicedContent,
                    });
                }

                console.log({results: finalResults});
                console.groupEnd();
            },
        });

        this.addCommand({
            id: "create-search-index",
            name: "Create search index",
            callback: async () => {
                const files = this.app.vault.getMarkdownFiles();
                const toWrite: FileEmbedding[] = new Array(50)
                let toWriteCount = 0
                const jobsToWait = []

                console.group("Creating search index");

                for (const file of files) {
                    const contents = await this.app.vault.cachedRead(file);

                    console.log(`Processing ${file.path}`);

                    for (const chunk of splitIntoChunks(contents)) {
                        const chunkEmbedding = await fetchEmbedding(chunk.content, false);

                        const vectorData = {
                            filepath: normalizePath(file.path),
                            chunk: {
                                ...chunk,
                                content: chunkEmbedding,
                            }
                        } as FileEmbedding;

                        toWrite[toWriteCount++] = vectorData;

                        if (toWriteCount === 50) {
                            jobsToWait.push(embeddingStore.overwriteFileEmbeddings(Array.from(toWrite)));
                        }
                    }

                }

                toWrite.length = toWriteCount;
                jobsToWait.push(embeddingStore.overwriteFileEmbeddings(toWrite))

                console.log("Waiting for all jobs to finish");
                await Promise.all(jobsToWait);
                console.log("Done");

                console.groupEnd();
            },
        });

        console.timeEnd("Plugin load time");
        console.groupEnd();
    }
}
