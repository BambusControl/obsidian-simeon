import {addIcon, App, normalizePath, Notice, Plugin, type PluginManifest, type WorkspaceLeaf} from "obsidian";
import {SettingTab} from "./components/settingTab";
import {RootPluginDataStorage} from "./services/impl/rootPluginDataStorage";
import {NewDataInitializer} from "./services/impl/newDataInitializer";
import {type FileEmbedding} from "../libraries/types/fileEmbedding";
import {EmbeddingStorage} from "./services/impl/embeddingStorage";
import {ICON_ID, ICON_SVG} from "./constants";
import {CounterView} from "./components/counterView";
import {COUNT_VIEW_TYPE, SEARCH_VIEW_TYPE, SearchView} from "./components/searchView";
import {splitIntoChunksFancy} from "./splitIntoChunksFancy";
import {EmbeddingService} from "./embeddingService";
import * as ONNX from "onnxruntime-web"
globalThis[Symbol.for('onnxruntime')] = ONNX

import {AutoModel, AutoTokenizer, matmul} from "@huggingface/transformers";
import {env} from '@huggingface/transformers';

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
            id: "test",
            name: "Test",
            callback: async () => {
                env.allowLocalModels = false;

                console.log(env);

                // Download from the 🤗 Hub
                const model_id = "onnx-community/embeddinggemma-300m-ONNX";
                const tokenizer = await AutoTokenizer.from_pretrained(model_id);
                const model = await AutoModel.from_pretrained(model_id, {
                    dtype: "q4", // Options: "fp32" | "q8" | "q4".
                });

                // Run inference with queries and documents
                const prefixes = {
                    query: "task: search result | query: ",
                    document: "title: none | text: ",
                };
                const query = prefixes.query + "Which planet is known as the Red Planet?";
                const documents = [
                    "Venus is often called Earth's twin because of its similar size and proximity.",
                    "Mars, known for its reddish appearance, is often referred to as the Red Planet.",
                    "Jupiter, the largest planet in our solar system, has a prominent red spot.",
                    "Saturn, famous for its rings, is sometimes mistaken for the Red Planet.",
                ].map((x) => prefixes.document + x);

                const inputs = await tokenizer([query, ...documents], {padding: true});
                const {sentence_embedding} = await model(inputs);

                // Compute similarities to determine a ranking
                const scores = await matmul(sentence_embedding, sentence_embedding.transpose(1, 0));
                const similarities = scores.tolist()[0].slice(1);
                console.log(similarities);
                // [ 0.30109718441963196, 0.6358831524848938, 0.4930494725704193, 0.48887503147125244 ]

                // Convert similarities to a ranking
                const ranking = similarities.map((score, index) => ({index, score})).sort((a, b) => b.score - a.score);
                console.log(ranking);
                // [
                //   { index: 1, score: 0.6358831524848938 },
                //   { index: 2, score: 0.4930494725704193 },
                //   { index: 3, score: 0.48887503147125244 },
                //   { index: 0, score: 0.30109718441963196 }
                // ]

            }
        })

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
                        const chunkEmbedding = await (await EmbeddingService.getInstance()).localEmbedDocument(null, chunk.content);

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

