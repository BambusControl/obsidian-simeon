import {CHUNK_OVERLAP, CHUNK_SIZE} from "./constants";
import type {Chunk} from "../libraries/types/chunk";


export function* splitIntoChunks(content: string): Generator<Chunk, number, void> {
    let chunkCount = 0;

    for (let i = 0; i < content.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
        const frontContentSplit = content.slice()
        const slicedString = content.slice(i, i + CHUNK_SIZE);

        yield {
            chunkNo: chunkCount,
            start: i,
            end: i + CHUNK_SIZE,
            content: slicedString
        } as Chunk;

        chunkCount++;
    }

    return chunkCount;
}

