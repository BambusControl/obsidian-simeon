import {CURRENT_VERSION, SaveData} from "../types/savedata/saveData";

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
