import type { TWSAdapterConstructionOptions } from "./ws-adapter";
import type { TMonacoAdapterConstructionOptions } from "./monaco";
import type { IDisposable } from "./types"
import type { EditorClientEvent, TEditorClientEventArgs } from "./plaintext-editor";
import type { Handler } from "mitt";

export type IWSMonacoEditorConstructionOptions = TWSAdapterConstructionOptions &
Omit<TMonacoAdapterConstructionOptions, "bindEvents">;

export interface IWSMonacoEditor extends IDisposable {
  /** Returns if the Editor has already been disposed. */
  disposed: boolean;
  /** Returns Text Content of the Editor. Can be used to both get and set. Returns empty string if already disposed. */
  text: string;
  /** Returns Unique Color code of the current User. Can be used to both get and set. */
  userColor: string;
  /** Returns Unique Id of the current User. Can be used to both get and set. */
  userId: string;
  /** Returns Name/Short Name of the current User. Can be used to both get and set. */
  userName: string | void;
  /** Clear user's Edit History so far to freeze Undo/Redo till further operation. */
  clearHistory(): void;
  /**
   * Returns false if at least one operation has been performed after initialisation for the first time, True otherwise.
   */
  isHistoryEmpty(): boolean;
  /**
   * Add listener to FireMonaco Editor.
   * @param event - Event name.
   * @param listener - Event handler callback.
   */
  on<Key extends EditorClientEvent>(
    event: Key,
    listener: Handler<TEditorClientEventArgs[Key]>
  ): void;
  /**
   * Remove listener to FireMonaco Editor.
   * @param event - Event name.
   * @param listener - Event handler callback (optional).
   */
  off<Key extends EditorClientEvent>(
    event: Key,
    listener?: Handler<TEditorClientEventArgs[Key]>
  ): void;
}
