import {App, Plugin, PluginManifest} from "obsidian";
import {SettingTab} from "./components/settingTab";
import {RootPluginDataStorage} from "./services/impl/rootPluginDataStorage";
import {NewDataInitializer} from "./services/impl/newDataInitializer";


/* Used by Obsidian */
// noinspection JSUnusedGlobalSymbols
export default class SimeonPlugin extends Plugin {

    constructor(
        app: App,
        manifest: PluginManifest,
    ) {
        super(app, manifest);
    }

    override async onload(): Promise<void> {
        console.group("Loading Simeon plugin");
        console.time("Plugin load time");

        console.info("Creating services");

        const dataStore = new RootPluginDataStorage(this);
        const initializer = new NewDataInitializer(dataStore);

        await initializer.initializeData();

        console.info("Adding UI elements");

        this.addSettingTab(new SettingTab(
            this.app,
            this,
        ));


        console.timeEnd("Plugin load time");
        console.groupEnd();
    }
}
