import {addIcon, App, normalizePath, Plugin, type PluginManifest, type WorkspaceLeaf} from "obsidian";
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
import {SearchView, SEARCH_VIEW_TYPE, COUNT_VIEW_TYPE} from "./components/searchView";


const ICON :string = "<svg fill=\"#000000\" width=\"128px\" height=\"128px\" viewBox=\"0 0 32 32\" xmlns=\"http://www.w3.org/2000/svg\" id=\"Layer_1\" data-name=\"Layer 1\"><path d=\"M18.85,6.41c.15,.21,.38,.33,.62,.33,.14,0,.29-.04,.42-.13,.34-.23,.43-.7,.2-1.04l-1.08-1.59c-.23-.34-.7-.43-1.04-.2-.34,.23-.43,.7-.2,1.04l1.08,1.59Z\"/><path d=\"M7.17,11.75c.09,.03,.18,.05,.27,.05,.3,0,.59-.18,.7-.48l.73-1.91c.15-.39-.04-.82-.43-.97-.38-.15-.82,.04-.97,.43l-.73,1.91c-.15,.39,.04,.82,.43,.97Z\"/><path d=\"M24.68,18.13c-.41-.04-.78,.25-.83,.66l-.2,1.81c-.04,.41,.25,.78,.67,.83,.03,0,.05,0,.08,0,.38,0,.7-.28,.75-.67l.2-1.81c.04-.41-.25-.78-.67-.83Z\"/><path d=\"M12.35,24.31l-1.66,.39c-.4,.09-.65,.5-.56,.9,.08,.35,.39,.58,.73,.58,.06,0,.12,0,.17-.02l1.66-.39c.4-.09,.65-.5,.56-.9-.1-.4-.51-.65-.9-.56Z\"/><path d=\"M30.73,16.27c0-.09,.01-.18,.01-.27C30.75,7.87,24.13,1.25,16,1.25S1.72,7.43,1.29,15.19c-.04,.09-.07,.19-.07,.3,0,.08,.02,.16,.04,.24,0,.09-.01,.18-.01,.27,0,8.13,6.62,14.75,14.75,14.75s14.28-6.18,14.71-13.94c.04-.09,.07-.19,.07-.3,0-.08-.02-.16-.04-.24ZM16,2.75c6.94,0,12.64,5.36,13.19,12.16-.18-.09-.37-.16-.62-.16-.74,0-1.12,.53-1.33,.81-.03,.04-.07,.1-.1,.14-.03-.04-.07-.1-.1-.14-.2-.28-.58-.81-1.32-.81s-1.12,.53-1.32,.81c-.03,.04-.07,.1-.1,.14-.03-.04-.07-.1-.1-.14-.13-.18-.34-.45-.66-.63-.52-3.7-3.69-6.55-7.53-6.55s-7.04,2.88-7.54,6.6c-.2-.13-.44-.24-.76-.24-.74,0-1.12,.53-1.33,.81-.03,.04-.07,.1-.1,.14-.03-.04-.07-.1-.1-.14-.2-.28-.58-.81-1.32-.81s-1.12,.53-1.32,.81c-.03,.04-.07,.1-.1,.14-.03-.04-.07-.1-.1-.14-.11-.15-.28-.38-.52-.55C3.31,8.17,9.03,2.75,16,2.75Zm6.12,13.25c0,3.37-2.74,6.12-6.12,6.12-3.19,0-5.82-2.46-6.09-5.59,0,0,0,0,0-.01,0,0,0-.02,0-.03-.01-.16-.02-.32-.02-.48,0-3.37,2.74-6.11,6.11-6.11,3.19,0,5.82,2.46,6.09,5.59,0,0,0,.01,0,.02,0,.01,0,.02,0,.03,.01,.16,.02,.32,.02,.48Zm-6.12,13.25c-6.94,0-12.64-5.36-13.19-12.16,.17,.09,.37,.16,.62,.16,.74,0,1.12-.53,1.32-.82,.03-.04,.07-.09,.1-.14,.03,.04,.07,.1,.1,.14,.2,.28,.58,.81,1.32,.81s1.12-.53,1.32-.81c.03-.04,.07-.1,.1-.14,.03,.04,.07,.1,.1,.14,.13,.18,.34,.45,.66,.63,.52,3.7,3.69,6.55,7.53,6.55s7.04-2.88,7.54-6.6c.2,.13,.44,.24,.75,.24,.74,0,1.12-.53,1.32-.82,.03-.04,.07-.09,.1-.14,.03,.04,.07,.1,.1,.14,.2,.28,.58,.81,1.32,.81s1.12-.53,1.33-.81c.03-.04,.07-.1,.1-.14,.03,.04,.07,.1,.1,.14,.11,.15,.28,.38,.52,.55-.51,6.85-6.23,12.26-13.2,12.26Z\"/></svg>"

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

        addIcon(
            "simeon",
            ICON
        )

        this.registerView(
          SEARCH_VIEW_TYPE,
          (leaf) => new SearchView(leaf)
        );

        this.registerView(
          COUNT_VIEW_TYPE,
          (leaf) => new CounterView(leaf)
        );

        this.addRibbonIcon("simeon", "Open Simeon Search", async () => {
            const {workspace} = this.app;

            const leaves = workspace.getLeavesOfType(SEARCH_VIEW_TYPE);
            let leaf: WorkspaceLeaf | null = null;

            if (leaves.length >= 1) {
                leaf = leaves[0];
            } else {
                leaf = workspace.getLeftLeaf(false);
                if (leaf != null) {
                    await leaf.setViewState({type: SEARCH_VIEW_TYPE, active: true});
                }
            }

            if (leaf != null) {
                //noinspection ES6MissingAwait (intentional)
                workspace.revealLeaf(leaf);
            }
        });

        this.addRibbonIcon("simeon", "Open Simeon Counter", async () => {
            const {workspace} = this.app;

            const leaves = workspace.getLeavesOfType(COUNT_VIEW_TYPE);
            let leaf: WorkspaceLeaf | null = null;

            if (leaves.length >= 1) {
                leaf = leaves[0];
            } else {
                leaf = workspace.getLeftLeaf(false);
                if (leaf != null) {
                    await leaf.setViewState({type: COUNT_VIEW_TYPE, active: true});
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
                } else {
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
                }

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
