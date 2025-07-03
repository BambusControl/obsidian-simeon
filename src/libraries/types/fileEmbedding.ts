import {Chunk} from "./chunk";

export interface FileEmbedding {
    filepath: string;
    chunk: Chunk<number[]>
}
