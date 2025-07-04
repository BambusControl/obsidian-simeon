import {Vault} from "obsidian";

export async function readVaultFile(vault: Vault, filepath: string): Promise<string> {
    const file = vault.getFileByPath(filepath);

    if (file == null) {
        return "";
    }

    return await vault.cachedRead(file);
}
