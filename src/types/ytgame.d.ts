/**
 * YouTube Playables Web SDK v1 Type Definitions
 * Based on the official YouTube Playables SDK Reference
 * https://developers.google.com/youtube/gaming/playables/reference/sdk
 */

export namespace ytgame {
  /**
   * Whether or not the game is running within the Playables environment.
   */
  export const IN_PLAYABLES_ENV: boolean;

  /**
   * The YouTube Playables SDK version string.
   */
  export const SDK_VERSION: string;

  /**
   * Error types that the YouTube Playables SDK can throw.
   */
  export enum SdkErrorType {
    API_UNAVAILABLE = "API_UNAVAILABLE",
    INVALID_PARAMS = "INVALID_PARAMS",
    SIZE_LIMIT_EXCEEDED = "SIZE_LIMIT_EXCEEDED",
    UNKNOWN = "UNKNOWN",
  }

  /**
   * The error object that the YouTube Playables SDK throws.
   */
  export class SdkError extends Error {
    readonly errorType: SdkErrorType;
    constructor(errorType: SdkErrorType, message?: string);
  }

  /**
   * Generic game behavior functions.
   */
  export namespace game {
    /**
     * Notifies YouTube that the game has begun showing frames.
     * MUST be called before gameReady().
     */
    export function firstFrameReady(): void;

    /**
     * Notifies YouTube that the game is ready for players to interact with.
     * MUST NOT be called while loading screens are still shown.
     */
    export function gameReady(): void;

    /**
     * Loads game data from YouTube in the form of a serialized string.
     */
    export function loadData(): Promise<string>;

    /**
     * Saves game data to YouTube in the form of a serialized UTF-16 string (max 3 MiB).
     */
    export function saveData(data: string): Promise<void>;
  }

  /**
   * YouTube system functions and event hooks.
   */
  export namespace system {
    /**
     * Returns the user's YouTube locale as a BCP-47 language tag (e.g. "en-US", "es-419").
     */
    export function getLanguage(): Promise<string>;

    /**
     * Returns whether the game audio is enabled in YouTube settings.
     */
    export function isAudioEnabled(): boolean;

    /**
     * Registers a callback triggered when YouTube audio settings change.
     * Returns an unregister function.
     */
    export function onAudioEnabledChange(callback: (isAudioEnabled: boolean) => void): () => void;

    /**
     * Registers a callback triggered when YouTube pauses the game.
     * Games should pause active gameplay and save state.
     */
    export function onPause(callback: () => void): () => void;

    /**
     * Registers a callback triggered when YouTube resumes the game.
     */
    export function onResume(callback: () => void): () => void;
  }

  /**
   * Player engagement functions.
   */
  export namespace engagement {
    export interface Score {
      value: number;
    }

    /**
     * Sends a score to YouTube. Scores are sorted and the highest is displayed.
     * Must be a non-negative safe integer.
     */
    export function sendScore(score: Score): Promise<void>;

  }

  /**
   * Game health reporting functions.
   */
  export namespace health {
    /**
     * Logs an error to YouTube (best-effort, rate-limited).
     */
    export function logError(): void;

    /**
     * Logs a warning to YouTube (best-effort, rate-limited).
     */
    export function logWarning(): void;
  }

}

declare global {
  interface Window {
    ytgame?: typeof ytgame;
    render_game_to_text?: () => string;
  }
  const ytgame: typeof import("./ytgame").ytgame | undefined;
}
