import {App, Plugin, PluginSettingTab, Setting} from "obsidian";

export class SettingTab extends PluginSettingTab {

    private rendered = false;

    constructor(
        app: App,
        plugin: Plugin,
    ) {
        super(app, plugin);
        this.containerEl.addClass("plugin", "simeon", "settings-tab")
    }

    override async display(): Promise<void> {
        if (this.rendered) {
            return;
        }

        const headingContainer = this.containerEl.createDiv({cls: "heading"});

        new Setting(headingContainer)
            .setHeading()
            .setName("Simeon")
            .setDesc("Hello to Simeon")
        ;
    }

    override async hide(): Promise<void> {
    }

}
