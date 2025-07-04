import {ItemView, WorkspaceLeaf} from "obsidian";

export const VIEW_TYPE_EXAMPLE = "example-view";

export class ExampleView extends ItemView {
    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    override getViewType() {
        return VIEW_TYPE_EXAMPLE;
    }

    override getDisplayText() {
        return "Example view";
    }

    override async onOpen() {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("h4", {text: "Example view"});
    }

    override async onClose() {
        // Nothing to clean up.
    }
}
