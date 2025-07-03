import {RootDataStore} from "../rootDataStore";
import {EmbeddingStore} from "../embeddingStore";
import {FileEmbedding} from "../../../libraries/types/fileEmbedding";

export function numArrayToBase64String(arr: Array<number>): string {
    const buffer: ArrayBufferLike = new Float64Array(arr).buffer;
    return Buffer.from(buffer).toString("base64");
}

export function base64StringToNumArray(str: string): Array<number> {
    const buffer = Buffer.from(str, "base64");

    const typedArray = new Float64Array(
        buffer.buffer,
        buffer.byteOffset,
        buffer.length / Float64Array.BYTES_PER_ELEMENT
    );

    return Array.from(typedArray);
}

export class EmbeddingStorage implements EmbeddingStore {

    constructor(
        private readonly store: RootDataStore,
    ) {
    }

    async getFileEmbeddings(): Promise<Array<FileEmbedding>> {
        const b64Embeddings = (await this.store.getEmbeddingData()).embeddings
        return b64Embeddings.map(embedding => ({
            ...embedding,
            chunk: {
                ...embedding.chunk,
                content: base64StringToNumArray(embedding.chunk.content),
            }
        }));
    }

    async addFileEmbedding(fileEmbedding: FileEmbedding): Promise<void> {
        const currentEmbeddings = await this.getFileEmbeddings();

        // Find path and chunk and update, or add new
        const updatedEmbeddings = currentEmbeddings.map(stored =>
            stored.filepath === fileEmbedding.filepath
            && stored.chunk.chunkNo === fileEmbedding.chunk.chunkNo
                ? fileEmbedding : stored
        );

        await this.overwriteFileEmbeddings(updatedEmbeddings);
    }

    async overwriteFileEmbeddings(fileEmbeddings: Array<FileEmbedding>): Promise<void> {
        const originalData = await this.store.getEmbeddingData();

        // To minimize changes in the savedata
        // First sort by filepath, then by chunk number
        const sortedEmbeddings = fileEmbeddings.sort((a, b) => {
            if (a.filepath < b.filepath) {
                return -1;
            } else if (a.filepath > b.filepath) {
                return 1;
            } else {
                return a.chunk.chunkNo - b.chunk.chunkNo;
            }
        });

        await this.store.overwriteEmbeddingData({
            ...originalData,
            embeddings: fileEmbeddings.map(embedding => ({
                ...embedding,
                chunk: {
                    ...embedding.chunk,
                    content: numArrayToBase64String(embedding.chunk.content),
                }
            })),
        });
    }

}
