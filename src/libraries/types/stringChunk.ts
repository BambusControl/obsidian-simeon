import type {ContentRange} from "../../simeon/contentRange";

export interface StringChunk {
    chunkNo: number;
    range: ContentRange
    content: string;
}

