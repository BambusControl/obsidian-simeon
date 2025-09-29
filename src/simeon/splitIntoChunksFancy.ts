import {Splitter} from "llm-text-splitter";
import type {StringChunk} from "../libraries/types/stringChunk";
import {getFrontMatterInfo} from "obsidian";

const llmSplitter = new Splitter({
    minLength: 5,
    maxLength: 1000,
    overlap: 50,
    splitter: "markdown",
    removeExtraSpaces: false,
});

export function* splitIntoChunksFancy(content: string): Generator<StringChunk, number, void> {
    let chunkCount = 0;
    let currentPosition = 0;

    const frontMatter = getFrontMatterInfo(content);

    if (frontMatter.exists) {
        const f = {
            chunkNo: chunkCount,
            range: {
                from: frontMatter.from,
                to: frontMatter.to,
            },
            content: frontMatter.frontmatter
        } as StringChunk;

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
            range: {
                from: offset + splitStart,
                to: offset + splitEnd,
            },
            content: split
        } as StringChunk;

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
