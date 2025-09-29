import {CHUNK_OVERLAP, CHUNK_SIZE} from "./constants";
import type {StringChunk} from "../libraries/types/stringChunk";


export function* splitIntoChunks(content: string): Generator<StringChunk, number, void> {
    let chunkCount = 0;

    for (let i = 0; i < content.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
        const frontContentSplit = content.slice()
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

