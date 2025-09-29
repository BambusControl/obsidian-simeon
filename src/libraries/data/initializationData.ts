import {CURRENT_VERSION, type SaveData} from "../types/savedata/saveData";

export function initializationData(): SaveData {
    return {
        initialized: false,
        version: CURRENT_VERSION,

        embedding: {
            initialized: false,
            embeddings: [],
        }
    }
}
