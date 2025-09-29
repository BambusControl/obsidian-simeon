import {addIcon, App, normalizePath, Notice, Plugin, type PluginManifest, type WorkspaceLeaf} from "obsidian";
import {SettingTab} from "./components/settingTab";
import {RootPluginDataStorage} from "./services/impl/rootPluginDataStorage";
import {NewDataInitializer} from "./services/impl/newDataInitializer";
import {type FileEmbedding} from "../libraries/types/fileEmbedding";
import {EmbeddingStorage} from "./services/impl/embeddingStorage";
import {ICON_ID, ICON_SVG} from "./constants";
import {fetchEmbedding} from "./fetchEmbedding";
import {cosineSimilarity} from "./cosineSimilarity";
import {readVaultFile} from "./readVaultFile";
import {splitIntoChunks} from "./splitIntoChunks";
import {CounterView} from "./components/counterView";
import {COUNT_VIEW_TYPE, SEARCH_VIEW_TYPE, SearchView} from "./components/searchView";
import {search_embedding_query} from "./search_embedding_query";
import {splitIntoChunksFancy} from "./splitIntoChunksFancy";
import {splitIntoChunksTrivial} from "./splitIntoChunksTrivial";

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
            ICON_ID,
            ICON_SVG
        );

        this.registerView(
            SEARCH_VIEW_TYPE,
            (leaf) => new SearchView(leaf, this.app.vault, embeddingStore)
        );

        this.registerView(
            COUNT_VIEW_TYPE,
            (leaf) => new CounterView(leaf)
        );

        this.addRibbonIcon(ICON_ID, "Open Simeon Search", async () => {
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

        this.addRibbonIcon(ICON_ID, "Open Simeon Counter", async () => {
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
            id: "create-search-index",
            name: "Create search index",
            callback: async () => {
                const files = this.app.vault.getMarkdownFiles();
                const toWrite: FileEmbedding[] = new Array(50);
                let fileCount = 0;
                let toWriteCount = 0;
                const jobsToWait = [];

                let notificationContent = "Creating simeon index\n"
                const notice = new Notice(notificationContent, 0);

                console.group("Creating search index");

                for (const file of files) {
                    fileCount++;
                    notice.setMessage(notificationContent + `${Math.floor(100 * fileCount / files.length)}% (${fileCount}/${files.length})`);
                    const contents = await this.app.vault.cachedRead(file);

                    for (const chunk of splitIntoChunksFancy(contents)) {
                        const chunkEmbedding = await fetchEmbedding(chunk.content, false);

                        toWrite[toWriteCount++] = {
                            filepath: normalizePath(file.path),
                            chunk: {
                                ...chunk,
                                content: chunkEmbedding,
                            }
                        } as FileEmbedding;

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
                notice.hide()

                console.groupEnd();
            },
        });

        console.timeEnd("Plugin load time");
        console.groupEnd();
    }
}

