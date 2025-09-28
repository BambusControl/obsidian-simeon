import {App, MarkdownView, TFile} from "obsidian";

/**
 * Opens a file in a new leaf, scrolls to a specific location, and highlights the text within the given range.
 *
 * @param app The Obsidian App instance.
 * @param fileToOpen The path to the file to open.
 * @param startOffset The starting character offset for the highlight.
 * @param endOffset The ending character offset for the highlight.
 */
export async function openFileAndHighlight(app: App, fileToOpen: TFile, startOffset: number, endOffset: number): Promise<void> {
    const leaf = app.workspace.getLeaf();
    await leaf.openFile(fileToOpen);

    const activeView = app.workspace.getActiveViewOfType(MarkdownView);
    if (activeView) {
        const editor = activeView.editor;

        const startPosition = editor.offsetToPos(startOffset);
        const endPosition = editor.offsetToPos(endOffset);

        editor.setSelection(startPosition, endPosition);
        editor.scrollIntoView({from: startPosition, to: endPosition}, true);
    } else {
        console.error("Could not get an active Markdown view to perform highlighting.");
    }
}
