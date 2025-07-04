import {DropdownComponent, ItemView, SearchComponent, setIcon, Setting, TFile, WorkspaceLeaf} from "obsidian";

export const SEARCH_VIEW_TYPE = "search-view";

interface SearchResult {
    file: TFile;
    content: string;
    match: {
        position: [number, number];
    };
}

export class SearchView extends ItemView {
    private searchInput?: SearchComponent;
    private resultsContainer?: HTMLElement;
    private resultsCountEl?: HTMLElement;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
        this.icon = "search";
    }

    override getViewType() {
        return SEARCH_VIEW_TYPE;
    }

    override getDisplayText() {
        return "Example Search";
    }

    override async onOpen() {
        const container = this.containerEl;
        container.empty();

        // --- Search Input Row ---
        const searchRow = container.createDiv({cls: "search-row"});

        // The SearchComponent creates its own container div. We will add classes to it.
        this.searchInput = new SearchComponent(searchRow)
            .setPlaceholder("Search...")
            .onChange((value) => {
                this.performSearch(value);
            })
        ;
        this.searchInput.containerEl.addClasses(["search-input-container", "global-search-input-container"]);

        // --- Results Info Bar ---
        const resultsInfoContainer = container.createDiv({cls: "search-results-info"});
        this.resultsCountEl = resultsInfoContainer.createDiv({cls: "search-results-result-count"});
        this.resultsCountEl.createSpan({text: "No results"});

        new DropdownComponent(resultsInfoContainer)
            .addOption("alphabetical", "File name (A to Z)")
            .addOption("alphabeticalReverse", "File name (Z to A)")
            .addOption("byModifiedTime", "Modified time (new to old)")
            .addOption("byModifiedTimeReverse", "Modified time (old to new)")
            .addOption("byCreatedTime", "Created time (new to old)")
            .addOption("byCreatedTimeReverse", "Created time (old to new)");

        // --- Results Container ---
        const searchResultContainer = container.createDiv({cls: "search-result-container mod-global-search"});
        this.resultsContainer = searchResultContainer.createDiv({cls: "search-results-children"});
    }

    async performSearch(query: string) {
        if (!query || query.trim() === "") {
            this.displayResults([]);
            return;
        }

        const lowerCaseQuery = query.toLowerCase();
        const files = this.app.vault.getMarkdownFiles();
        const results: SearchResult[] = [];

        for (const file of files) {
            const content = await this.app.vault.cachedRead(file);
            const lines = content.split("\n");

            for (const line of lines) {
                const matchIndex = line.toLowerCase().indexOf(lowerCaseQuery);
                if (matchIndex > -1) {
                    results.push({
                        file: file,
                        content: line,
                        match: {position: [matchIndex, matchIndex + query.length]}
                    });
                    // For simplicity, we only take the first match per file
                    break;
                }
            }
        }
        this.displayResults(results);
    }

    displayResults(results: SearchResult[]) {

        this.resultsContainer.empty();
        this.resultsCountEl.children[0].setText(`${results.length} result${results.length !== 1 ? "s" : ""}`);

        if (results.length === 0) {
            return;
        }

        const resultsByFile: Record<string, SearchResult[]> = {};
        for (const result of results) {
            if (!resultsByFile[result.file.path]) {
                resultsByFile[result.file.path] = [];
            }
            resultsByFile[result.file.path].push(result);
        }

        for (const filePath in resultsByFile) {
            const fileResults = resultsByFile[filePath];
            const file = fileResults[0].file;

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

                const before = result.content.substring(0, result.match.position[0]);
                const matched = result.content.substring(result.match.position[0], result.match.position[1]);
                const after = result.content.substring(result.match.position[1]);

                snippetEl.createSpan({text: before});
                snippetEl.createSpan({text: matched, cls: "search-result-file-matched-text"});
                snippetEl.createSpan({text: after});

                snippetEl.addEventListener("click", () => {
                    this.app.workspace.getLeaf().openFile(result.file);
                });
            }
        }
    }
}
