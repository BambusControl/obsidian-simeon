import {ItemView, WorkspaceLeaf} from "obsidian";

import Counter from "./Counter.svelte";
import {mount, unmount} from "svelte";

export const COUNTER_VIEW_TYPE = "counter";

export class CounterView extends ItemView {
    // A variable to hold on to the Counter instance mounted in this ItemView.
    counter: ReturnType<typeof Counter> | undefined;

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    override getViewType() {
        return COUNTER_VIEW_TYPE;
    }

    override getDisplayText() {
        return "Example view";
    }

    override async onOpen() {
        // Attach the Svelte component to the ItemViews content element and provide the needed props.
        this.counter = mount(Counter, {
            target: this.contentEl,
            props: {
                startCount: 5,
            }
        });

        // Since the component instance is typed, the exported `increment` method is known to TypeScript.
        this.counter.increment();
    }

    override async onClose() {
        if (this.counter) {
            // Remove the Counter from the ItemView.
            unmount(this.counter);
        }
    }
}
