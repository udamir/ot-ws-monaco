import { WSAdapter } from "./ws-adapter";
import { MonacoAdapter } from "./monaco";
import {
  EditorClient,
  IDatabaseAdapter,
  IEditorAdapter,
  IEditorClient,
  TEditorClientEventArgs,
} from "./plaintext-editor";
import { Handler } from "mitt";
import { EditorClientEvent } from "./plaintext-editor";

import { IWSMonacoEditor, IWSMonacoEditorConstructionOptions } from "./ws-monaco.types";

export class WSMonacoEditor implements IWSMonacoEditor {
  protected readonly _databaseAdapter: IDatabaseAdapter;
  protected readonly _editorAdapter: IEditorAdapter;
  protected readonly _editorClient: IEditorClient;

  protected _disposed: boolean = false;
  protected _userId: string;
  protected _userColor: string;
  protected _userName: string | null = null;

  constructor({
    announcementDuration,
    editor,
    serverUrl,
    userId,
    userColor,
    userName,
  }: IWSMonacoEditorConstructionOptions) {
    this._databaseAdapter = new WSAdapter({
      serverUrl,
      userId,
      userColor,
      userName,
    });
    this._editorAdapter = new MonacoAdapter({
      announcementDuration,
      editor,
      bindEvents: true,
    });
    this._editorClient = new EditorClient({
      databaseAdapter: this._databaseAdapter,
      editorAdapter: this._editorAdapter,
    });

    this._userColor = userColor;
    this._userId = userId;
    this._userName = userName ?? null;
  }

  get disposed(): boolean {
    return this._disposed;
  }

  get text(): string {
    if (this._disposed) {
      return "";
    }

    return this._editorAdapter.getText();
  }

  set text(content: string) {
    if (this._disposed) {
      return;
    }

    this._editorAdapter.setText(content);
  }

  get userColor(): string {
    return this._userColor;
  }

  set userColor(userColor: string) {
    if (this._disposed) {
      return;
    }

    this._databaseAdapter.setUserColor(userColor);
    this._userColor = userColor;
  }

  get userId(): string {
    return this._userId;
  }

  set userId(userId: string) {
    if (this._disposed) {
      return;
    }

    this._databaseAdapter.setUserId(userId);
    this._userId = userId;
  }

  get userName(): string {
    return this._userName ?? this._userId;
  }

  set userName(userName: string) {
    if (this._disposed) {
      return;
    }

    this._databaseAdapter.setUserName(userName);
    this._userName = userName;
  }

  clearHistory(): void {
    this._editorClient.clearUndoRedoStack();
  }

  dispose(): void {
    if (this._disposed) {
      return;
    }

    this._editorClient.dispose();
    this._databaseAdapter.dispose();
    this._editorAdapter.dispose();

    // @ts-expect-error
    this._databaseAdapter = null;
    // @ts-expect-error
    this._editorAdapter = null;
    //@ts-expect-error
    this._editorClient = null;

    this._disposed = true;
  }

  isHistoryEmpty(): boolean {
    return this._databaseAdapter.isHistoryEmpty();
  }

  on<Key extends EditorClientEvent>(
    event: Key,
    listener: Handler<TEditorClientEventArgs[Key]>
  ): void {
    this._editorClient.on(event, listener);
  }

  off<Key extends EditorClientEvent>(
    event: Key,
    listener?: Handler<TEditorClientEventArgs[Key]>
  ): void {
    this._editorClient.off(event, listener);
  }
}
