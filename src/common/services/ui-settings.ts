import type { AppConfig, AvailableLanguage, AvailableColorTheme } from '@main/common/types';

export interface AppConfigsInternal {
  getSettingsFile: () => Promise<AppSettings>;
  saveSettingsFile: (data: AppSettings) => Promise<void>;
  getCurrentLanguage: () => Promise<AvailableLanguage>;
  getCurrentColorTheme: () => Promise<AvailableColorTheme>;
}

export interface AppConfigs {
  getCurrentLanguage: () => Promise<AvailableLanguage>;
  getCurrentColorTheme: () => Promise<AvailableColorTheme>;
  watchConfig(obs: web3n.Observer<AppConfig>): () => void;
}

export interface SettingsJSON {
  lang: AvailableLanguage;
  colorTheme: AvailableColorTheme;
}

export interface AppSettings {
  currentConfig: SettingsJSON;
}

const resourceName = 'ui-settings';
const resourceApp = 'launcher.app.privacysafe.io';
const settingsPath = '/constants/settings.json';

export class UISettings implements AppConfigs, AppConfigsInternal {
  private constructor(private readonly file: web3n.files.File) {}

  static async makeInternalService(): Promise<AppConfigsInternal> {
    // this implicitly initializes resource, and will fail if it isn't launcher
    await w3n.shell!.getFSResource!(undefined, resourceName);
    const localStore = await w3n.storage!.getAppLocalFS!();
    const file = await localStore.writableFile(settingsPath);
    return new UISettings(file);
  }

  static async makeResourceReader(): Promise<AppConfigs> {
    const file = await w3n.shell!.getFSResource!(resourceApp, resourceName);
    return new UISettings(file as web3n.files.ReadonlyFile);
  }

  private get writableFile(): web3n.files.WritableFile {
    if (this.file.writable) {
      return this.file as web3n.files.WritableFile;
    } else {
      throw Error(`This instance can only read ${resourceName} file resource provided by ${resourceApp}`);
    }
  }

  async getSettingsFile(): Promise<AppSettings> {
    const currentConfig = await this.file.readJSON<SettingsJSON>();
    return { currentConfig };
  }

  async saveSettingsFile(data: AppSettings): Promise<void> {
    const settingsJSON = data.currentConfig as SettingsJSON;
    await this.writableFile.writeJSON(settingsJSON);
  }

  async getCurrentLanguage(): Promise<AvailableLanguage> {
    const { lang } = await this.file.readJSON<SettingsJSON>();
    return lang;
  }

  async getCurrentColorTheme(): Promise<AvailableColorTheme> {
    const { colorTheme } = await this.file.readJSON<SettingsJSON>();
    return colorTheme;
  }

  watchConfig(obs: web3n.Observer<AppConfig>): () => void {
    return this.file.watch({
      next: obs.next
        ? async event => {
          if (event.type === 'file-change') {
            const lang = await this.getCurrentLanguage();
            const colorTheme = await this.getCurrentColorTheme();
            obs.next!({ lang, colorTheme });
          }
        }
        : undefined,
      complete: obs.complete ? () => obs.complete!() : undefined,
      error: err => (obs.error ? obs.error!(err) : undefined),
    });
  }
}
