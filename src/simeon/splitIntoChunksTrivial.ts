import type {StringChunk} from "../libraries/types/stringChunk";
import {getFrontMatterInfo} from "obsidian";

export function* splitIntoChunksTrivial(content: string): Generator<StringChunk, number, void> {
    let chunkCount = 0;
    let currentPosition = 0;

    const frontMatter = getFrontMatterInfo(content);

    if (frontMatter.exists) {
        yield {
            chunkNo: chunkCount++,
            range: {
                from: frontMatter.from,
                to: frontMatter.to,
            },
            content: frontMatter.frontmatter
        } as StringChunk;

        currentPosition = frontMatter.contentStart;
    }

    const justContent = content.slice(currentPosition);
    const offset = currentPosition;

    yield {
        chunkNo: chunkCount++,
        range: {
            from: offset,
            to: offset + justContent.length,
        },
        content: justContent
    } as StringChunk;

    return chunkCount;
}
