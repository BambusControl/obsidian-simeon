import {CHUNK_OVERLAP, CHUNK_SIZE} from "./constants";
import type {StringChunk} from "../libraries/types/stringChunk";

/*  Structure:
* -----------
* > page breaks `---`
* > headers 1->X
* > paragraphs/text blocks separated by a new line (3x \n)
* */

/* Remake in rust... */
export function* fancySplitIntoChunks(content: string): Generator<StringChunk, number, void> {
    let processedContent = content.slice();

    /* Remove frontmatter */
    if (processedContent.startsWith("---\n")) {
        const frontmatterEndPosition = processedContent.indexOf("---\n");
        processedContent = processedContent.slice(frontmatterEndPosition + 1);
    }

    /* Split by page breaks */
    const pageBreaks = processedContent.split("---\n");

    let chunkCount = 0;

    for (let i = 0; i < content.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
        const slicedString = content.slice(i, i + CHUNK_SIZE);

        yield {
            chunkNo: chunkCount,
            range: {
                from: i,
                to: i + CHUNK_SIZE,
            },
            content: slicedString
        } as StringChunk;

        chunkCount++;
    }

    return chunkCount;
}
