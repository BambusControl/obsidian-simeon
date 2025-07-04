import {App, normalizePath, Plugin, type PluginManifest, type WorkspaceLeaf} from "obsidian";
import {SettingTab} from "./components/settingTab";
import {RootPluginDataStorage} from "./services/impl/rootPluginDataStorage";
import {NewDataInitializer} from "./services/impl/newDataInitializer";
import {type FileEmbedding} from "../libraries/types/fileEmbedding";
import {EmbeddingStorage} from "./services/impl/embeddingStorage";
import {MarkdownTextSplitter} from "@langchain/textsplitters";
import {CHUNK_OVERLAP, CHUNK_SIZE} from "./constants";
import {fetchEmbedding} from "./fetchEmbedding";
import {cosineSimilarity} from "./cosineSimilarity";
import {readVaultFile} from "./readVaultFile";
import {splitIntoChunks} from "./splitIntoChunks";
import {CounterView} from "./components/counterView";
import {ExampleView, VIEW_TYPE_EXAMPLE} from "./components/exampleView";


const fancySplitter = new MarkdownTextSplitter({
    chunkSize: CHUNK_SIZE,
    chunkOverlap: CHUNK_OVERLAP,
});

/* Used by Obsidian */
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

        this.registerView(
          VIEW_TYPE_EXAMPLE,
          (leaf) => new ExampleView(leaf)
        );

        this.addRibbonIcon("search", "Open Search Panel", async () => {
            const {workspace} = this.app;

            const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);
            let leaf: WorkspaceLeaf | null = null;

            if (leaves.length >= 1) {
                leaf = leaves[0];
            } else {
                leaf = workspace.getLeftLeaf(false);
                if (leaf != null) {
                    await leaf.setViewState({type: VIEW_TYPE_EXAMPLE, active: true});
                }
            }

            if (leaf != null) {
                //noinspection ES6MissingAwait (intentional)
                workspace.revealLeaf(leaf);
            }
        });

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
                const toWrite: FileEmbedding[] = new Array(50);
                let toWriteCount = 0;
                const jobsToWait = [];

                console.group("Creating search index");

                for (const file of files) {
                    const contents = await this.app.vault.cachedRead(file);
                    console.log(`Processing ${file.path}`);
                    continue;

                    const fancySplit = await fancySplitter.splitText(contents);
                    console.log({fancySplit});

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
                jobsToWait.push(embeddingStore.overwriteFileEmbeddings(toWrite));

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
