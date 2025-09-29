import {Splitter} from "llm-text-splitter";
import type {Chunk} from "../libraries/types/chunk";
import {getFrontMatterInfo} from "obsidian";

const llmSplitter = new Splitter({
    minLength: 4,
    maxLength: 400,
    overlap: 40,
    splitter: "paragraph",
    removeExtraSpaces: false,
});

export function* splitIntoChunksFancy(content: string): Generator<Chunk, number, void> {
    let chunkCount = 0;
    let currentPosition = 0;

    const frontMatter = getFrontMatterInfo(content);

    if (frontMatter.exists) {
        const f = {
            chunkNo: chunkCount,
            start: frontMatter.from,
            end: frontMatter.to,
            content: frontMatter.frontmatter
        } as Chunk;

        currentPosition = frontMatter.contentStart;
        chunkCount++;

        //console.log(f)
        yield f;
    }

    const justContent = content.slice(currentPosition);
    const offset = currentPosition;

    const splits = llmSplitter.split(justContent);
    //const pairedSplits = pairItems(splits, 3);

    for (const split of splits) {
        const splitStart = justContent.indexOf(split);

        if (splitStart === -1) {
            console.error("Split not found in content", {
                hay: justContent,
                needle: split,
            });
            continue;
        }

        const splitEnd = splitStart + split.length;

        const f = {
            chunkNo: chunkCount,
            start: offset + splitStart,
            end: offset + splitEnd,
            content: split
        } as Chunk;

        chunkCount++;

        yield f;
    }

    return chunkCount;
}

/**
 * Pairs separate items together, reducing the number of items.
 * For count of 2: ["a", "b", "c", "d", "e" ] -> [ "ab", "cd", "e"]
 * @param items
 * @param count
 */
function pairItems(items: string[], count: number) {
    const result: string[] = [];

    for (let i = 0; i < items.length; i += count) {
        const group = items.slice(i, i + count);
        result.push(group.join(""));
    }

    return result;
}
