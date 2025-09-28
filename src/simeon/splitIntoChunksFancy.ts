import {Splitter} from "llm-text-splitter";
import {CHUNK_OVERLAP, CHUNK_SIZE} from "./constants";
import type {Chunk} from "../libraries/types/chunk";
import {getFrontMatterInfo} from "obsidian";

const llmSplitter = new Splitter({
    minLength: 40,
    maxLength: 400,
    overlap: 40,
    splitter: "sentence",
});

export function* splitIntoChunksFancy(content: string): Generator<Chunk<string>, number, void> {
    console.group("Chunks")
    let chunkCount = 0;
    let currentPosition = 0;

    const frontMatter = getFrontMatterInfo(content);

    if (frontMatter.exists) {
        const f = {
            chunkNo: chunkCount,
            start: frontMatter.from,
            end: frontMatter.to,
            overlap: CHUNK_OVERLAP,
            content: frontMatter.frontmatter
        } as Chunk<string>;

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
        const splitStart = content.indexOf(split, currentPosition);
        const splitEnd = splitStart + split.length;

        const f = {
            chunkNo: chunkCount,
            start: offset + splitStart,
            end: offset + splitEnd,
            overlap: CHUNK_OVERLAP,
            content: split
        } as Chunk<string>;


        currentPosition = splitEnd;
        chunkCount++;

        //console.log(f)
        yield f;
    }
    console.groupEnd();

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
