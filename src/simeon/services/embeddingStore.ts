import {FileEmbedding} from "../../libraries/types/fileEmbedding";

export interface EmbeddingStore {
    getFileEmbeddings(): Promise<Array<FileEmbedding>>;
    addFileEmbedding(fileEmbedding: FileEmbedding): Promise<void>
    overwriteFileEmbeddings(fileEmbeddings: Array<FileEmbedding>): Promise<void>;
}
