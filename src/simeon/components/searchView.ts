import {debounce, ItemView, SearchComponent, setIcon, type Vault, WorkspaceLeaf} from "obsidian";
import {search_embedding_query} from "../search_embedding_query";
import type {EmbeddingStorage} from "../services/impl/embeddingStorage";
import {openFileAndHighlight} from "../openFileAndHighlight";
import type {SearchResult} from "../search_result";
import {SimeonError} from "../errors/simeonError";

export const SEARCH_VIEW_TYPE = "simeon-search-view";
export const COUNT_VIEW_TYPE = "simeon-count-view";

export class SearchView extends ItemView {
    //@ts-ignore
    private searchInput: SearchComponent;
    //@ts-ignore
    private resultsContainer: HTMLElement;
    //@ts-ignore
    private resultsCountEl: HTMLElement;

    constructor(
        leaf: WorkspaceLeaf,
        private readonly vault: Vault,
        private readonly embeddingStore: EmbeddingStorage,
    ) {
        super(leaf);
        this.icon = "search";
    }

    override getViewType() {
        return SEARCH_VIEW_TYPE;
    }

    override getDisplayText() {
        return "Search with Simeon";
    }

    override async onOpen() {
        const container = this.containerEl;
        container.empty();

        // --- Search Input Row ---
        const searchRow = container.createDiv({cls: "search-row"});

        const debounced = debounce(
            /* HAS TO BE LIKE THIS TO CAPTURE THE `this` */
            (value: string) => this.performSearch(value),
            1000,
            true
        )

        // The SearchComponent creates its own container div. We will add classes to it.
        this.searchInput = new SearchComponent(searchRow)
            .setPlaceholder("Search...")
            .onChange(async (value) => await debounced(value))
        ;
        this.searchInput.containerEl.addClasses(["search-input-container", "global-search-input-container"]);

        // --- Results Info Bar ---
        const resultsInfoContainer = container.createDiv({cls: "search-results-info"});
        this.resultsCountEl = resultsInfoContainer.createDiv({cls: "search-results-result-count"});
        this.resultsCountEl.createSpan({text: "No results"});

        // --- Results Container ---
        const searchResultContainer = container.createDiv({cls: "search-result-container mod-global-search"});
        this.resultsContainer = searchResultContainer.createDiv({cls: "search-results-children"});
    }

    async performSearch(query: string) {
        if (!query || query.trim() === "") {
            this.displayResults([]);
            return;
        }

        const results = await search_embedding_query(this.vault, this.embeddingStore, query);

        this.displayResults(results);
    }

    displayResults(results: SearchResult[]) {
        // TODO: add the similarity score to the results

        this.resultsContainer.empty();
        this.resultsCountEl.children[0].setText(`${results.length} result${results.length !== 1 ? "s" : ""}`);

        if (results.length === 0) {
            return;
        }

        const resultsByFile: Record<string, SearchResult[]> = {};
        for (const result of results) {
            if (!resultsByFile[result.filepath]) {
                resultsByFile[result.filepath] = [];
            }
            resultsByFile[result.filepath].push(result);
        }

        for (const filepath in resultsByFile) {
            const fileResults = resultsByFile[filepath];

            const file = this.app.vault.getFileByPath(filepath);
            if (!file) {
                throw new SimeonError(`File not found: ${filepath}`);
            }


            const fileGroupEl = this.resultsContainer.createDiv({cls: "tree-item search-result"});
            const fileHeaderEl = fileGroupEl.createDiv({cls: "tree-item-self search-result-file-title is-clickable"});

            const collapseIcon = fileHeaderEl.createDiv({cls: "tree-item-icon collapse-icon"});
            setIcon(collapseIcon, "right-triangle");

            fileHeaderEl.createDiv({text: file.basename, cls: "tree-item-inner"});
            const flair = fileHeaderEl.createDiv({cls: "tree-item-flair-outer"});
            flair.createSpan({text: fileResults.length.toString(), cls: "tree-item-flair"});

            const matchesEl = fileGroupEl.createDiv({cls: "search-result-file-matches"});

            fileHeaderEl.onClickEvent(() => {
                const isCollapsed = matchesEl.style.display === "none";
                collapseIcon.toggleClass("is-collapsed", isCollapsed);
                /* todo remove results (toggle with internal state manager) */
            });

            for (const result of fileResults) {
                const snippetEl = matchesEl.createDiv({cls: "search-result-file-match tappable"});

                const before = result.content.substring(0, result.highlight.from);
                const matched = result.content.substring(result.highlight.from, result.highlight.to);
                const after = result.content.substring(result.highlight.to);

                snippetEl.createSpan({text: before});
                snippetEl.createSpan({text: matched, cls: "search-result-file-matched-text"});
                snippetEl.createSpan({text: after});

                snippetEl.addEventListener("click", () => {
                    //this.app.workspace.getLeaf().openFile(result.file);
                    openFileAndHighlight(this.app, file, result.matchStart, result.matchEnd)
                });
            }
        }
    }
}
