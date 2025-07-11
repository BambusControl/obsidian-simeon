import {Initializable} from "./initializable";
import {FileEmbedding} from "../fileEmbedding";
import {EmbeddingData} from "./embeddingData";

export interface SaveData extends Initializable {
    version: SaveDataVersion;

    embedding: EmbeddingData;
}

/**
 * Version of the save data schema.
 *
 * Must comply with RegEx:
 * ```^[0-9]+\\.[0-9]+\\.[0-9]+(?:-[A-Z]+)?$```
 */
export type SaveDataVersion
    = "0.1.0"
    // Update only if save data schema changed
    ;

export const CURRENT_VERSION: SaveDataVersion = "0.1.0";
