import {Initializable} from "./initializable";
import {FileEmbedding} from "../fileEmbedding";
import {FileEmbeddingBinary} from "../fileEmbeddingBinary";

export interface EmbeddingData extends Initializable {
    embeddings: Array<FileEmbeddingBinary>;
}
