import { GameEvents } from "./event-system";

/**
 * AssetManager - Handles loading and caching of game assets
 */
export class AssetManager {
  // Asset caches by type
  images: Map<string, HTMLImageElement>;
  sounds: Map<string, HTMLAudioElement>;
  fonts: Map<string, FontFace>;
  data: Map<string, any>;

  // Tracking loading state
  totalAssets: number;
  loadedAssets: number;
  isLoading: boolean;

  // Asset lists to load
  private imagesToLoad: Array<{ key: string; path: string }>;
  private soundsToLoad: Array<{ key: string; path: string }>;
  private fontsToLoad: Array<{ fontFamily: string; url: string }>;
  private dataToLoad: Array<{ key: string; path: string }>;

  constructor() {
    // Initialize asset caches
    this.images = new Map<string, HTMLImageElement>();
    this.sounds = new Map<string, HTMLAudioElement>();
    this.fonts = new Map<string, FontFace>();
    this.data = new Map<string, any>();

    // Initialize loading state
    this.totalAssets = 0;
    this.loadedAssets = 0;
    this.isLoading = false;

    // Initialize asset lists
    this.imagesToLoad = [];
    this.soundsToLoad = [];
    this.fontsToLoad = [];
    this.dataToLoad = [];
  }

  /**
   * Queue an image to be loaded
   * @param key - Unique identifier for the image
   * @param path - File path to the image
   * @returns This asset manager for chaining
   */
  queueImage(key: string, path: string): AssetManager {
    this.imagesToLoad.push({ key, path });
    this.totalAssets++;
    return this;
  }

  /**
   * Queue a sound to be loaded
   * @param key - Unique identifier for the sound
   * @param path - File path to the sound
   * @returns This asset manager for chaining
   */
  queueSound(key: string, path: string): AssetManager {
    this.soundsToLoad.push({ key, path });
    this.totalAssets++;
    return this;
  }

  /**
   * Queue a font to be loaded
   * @param fontFamily - Font family name
   * @param url - URL to the font file
   * @returns This asset manager for chaining
   */
  queueFont(fontFamily: string, url: string): AssetManager {
    this.fontsToLoad.push({ fontFamily, url });
    this.totalAssets++;
    return this;
  }

  /**
   * Queue JSON data to be loaded
   * @param key - Unique identifier for the data
   * @param path - File path to the JSON data
   * @returns This asset manager for chaining
   */
  queueData(key: string, path: string): AssetManager {
    this.dataToLoad.push({ key, path });
    this.totalAssets++;
    return this;
  }

  /**
   * Load all queued assets
   * @returns Promise that resolves when all assets are loaded
   */
  loadAll(): Promise<{
    images: Map<string, HTMLImageElement>;
    sounds: Map<string, HTMLAudioElement>;
    fonts: Map<string, FontFace>;
    data: Map<string, any>;
  }> {
    // Skip if already loading
    if (this.isLoading) {
      return Promise.reject(new Error("Assets are already loading"));
    }

    this.isLoading = true;
    this.loadedAssets = 0;

    // Emit loading start event
    GameEvents.emit("assets:loadStart", { total: this.totalAssets });

    // Create promises for each asset type
    const imagePromises = this.loadImages();
    const soundPromises = this.loadSounds();
    const fontPromises = this.loadFonts();
    const dataPromises = this.loadData();

    // Combine all promises
    return Promise.all([
      ...imagePromises,
      ...soundPromises,
      ...fontPromises,
      ...dataPromises,
    ])
      .then(() => {
        this.isLoading = false;

        // Emit loading complete event
        GameEvents.emit("assets:loadComplete", {
          images: this.images,
          sounds: this.sounds,
          fonts: this.fonts,
          data: this.data,
        });

        // Clear queues
        this.imagesToLoad = [];
        this.soundsToLoad = [];
        this.fontsToLoad = [];
        this.dataToLoad = [];

        return {
          images: this.images,
          sounds: this.sounds,
          fonts: this.fonts,
          data: this.data,
        };
      })
      .catch((error) => {
        this.isLoading = false;
        GameEvents.emit("assets:loadError", error);
        throw error;
      });
  }

  /**
   * Load all queued images
   * @returns Array of promises for image loading
   * @private
   */
  private loadImages(): Promise<HTMLImageElement>[] {
    return this.imagesToLoad.map(({ key, path }) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();

        img.onload = () => {
          this.images.set(key, img);
          this.loadedAssets++;
          this.emitProgress();
          resolve(img);
        };

        img.onerror = () => {
          reject(new Error(`Failed to load image: ${path}`));
        };

        img.src = path;
      });
    });
  }

  /**
   * Load all queued sounds
   * @returns Array of promises for sound loading
   * @private
   */
  private loadSounds(): Promise<HTMLAudioElement>[] {
    return this.soundsToLoad.map(({ key, path }) => {
      return new Promise<HTMLAudioElement>((resolve, reject) => {
        const audio = new Audio();

        audio.oncanplaythrough = () => {
          this.sounds.set(key, audio);
          this.loadedAssets++;
          this.emitProgress();
          resolve(audio);
        };

        audio.onerror = () => {
          reject(new Error(`Failed to load sound: ${path}`));
        };

        audio.src = path;
        audio.load();
      });
    });
  }

  /**
   * Load all queued fonts
   * @returns Array of promises for font loading
   * @private
   */
  private loadFonts(): Promise<FontFace>[] {
    return this.fontsToLoad.map(({ fontFamily, url }) => {
      return new Promise<FontFace>((resolve, reject) => {
        // Create a @font-face rule
        const fontFace = new FontFace(fontFamily, `url(${url})`);

        fontFace
          .load()
          .then((loadedFace) => {
            // Add to fonts collection
            document.fonts.add(loadedFace);
            this.fonts.set(fontFamily, loadedFace);

            this.loadedAssets++;
            this.emitProgress();
            resolve(loadedFace);
          })
          .catch((error) => {
            reject(
              new Error(`Failed to load font: ${fontFamily} - ${error.message}`)
            );
          });
      });
    });
  }

  /**
   * Load all queued data files
   * @returns Array of promises for data loading
   * @private
   */
  private loadData(): Promise<any>[] {
    return this.dataToLoad.map(({ key, path }) => {
      return fetch(path)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load data: ${path}`);
          }
          return response.json();
        })
        .then((data) => {
          this.data.set(key, data);
          this.loadedAssets++;
          this.emitProgress();
          return data;
        });
    });
  }

  /**
   * Emit a progress event
   * @private
   */
  private emitProgress(): void {
    GameEvents.emit("assets:loadProgress", {
      loaded: this.loadedAssets,
      total: this.totalAssets,
      progress: this.loadedAssets / this.totalAssets,
    });
  }

  /**
   * Get a loaded image by key
   * @param key - Image key
   * @returns The loaded image or undefined if not found
   */
  getImage(key: string): HTMLImageElement | undefined {
    return this.images.get(key);
  }

  /**
   * Get a loaded sound by key
   * @param key - Sound key
   * @returns The loaded sound or undefined if not found
   */
  getSound(key: string): HTMLAudioElement | undefined {
    // Return a clone to allow playing the same sound multiple times
    const original = this.sounds.get(key);
    if (!original) {
      return undefined;
    }

    return original.cloneNode() as HTMLAudioElement;
  }

  /**
   * Get a loaded font by family name
   * @param fontFamily - Font family name
   * @returns The loaded font or undefined if not found
   */
  getFont(fontFamily: string): FontFace | undefined {
    return this.fonts.get(fontFamily);
  }

  /**
   * Get loaded data by key
   * @param key - Data key
   * @returns The loaded data or undefined if not found
   */
  getData(key: string): any | undefined {
    return this.data.get(key);
  }

  /**
   * Play a sound by key
   * @param key - Sound key
   * @param volume - Volume level (0.0 to 1.0)
   * @param loop - Whether to loop the sound
   * @returns The playing sound element or undefined if not found
   */
  playSound(
    key: string,
    volume: number = 1.0,
    loop: boolean = false
  ): HTMLAudioElement | undefined {
    const sound = this.getSound(key);
    if (!sound) {
      return undefined;
    }

    sound.volume = volume;
    sound.loop = loop;
    sound.play().catch((error) => {
      console.error(`Error playing sound ${key}:`, error);
    });

    return sound;
  }
}

/**
 * Singleton instance of AssetManager
 */
export const assetManager = new AssetManager();

export default assetManager;
