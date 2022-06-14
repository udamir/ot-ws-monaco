import mitt, { Emitter, Handler } from "mitt";

import { IPlainTextOperation, PlainTextOperation, TPlainTextOperation } from "./plaintext";
import { ICursor, DatabaseAdapterEvent, IDatabaseAdapter, TDatabaseAdapterEventArgs } from "./plaintext-editor";
import { InvalidOperationError } from "./utils";

export type TWSAdapterConstructionOptions = {
  /** Firebase Database Reference. */
  serverUrl: string;
  /** Unique Identifier of the User. */
  userId: string;
  /** Color String (Hex, HSL, RGB, Text etc.) for Cursor/Selection. */
  userColor: string;
  /** Name or Short Name of the User. */
  userName?: string;
};


type TRevision = { 
  userId: string
  revision: number
  operation: TPlainTextOperation
} 

type TUser = {
  userColor: string
  userName: string
}

/**
 * @internal
 * Copy of the Operation and Revision Id just sent.
 */
 export type TSentOperation = {
  /** Revision */
  revision: number;
  /** Operation Sent to Server */
  operation: IPlainTextOperation;
};

/**
 * @public
 * Websocker Server Events.
 */
 export enum ServerEvent {
  UserConnected = "user:connected",
  UserDisconnected = "user:disconnected",
  UserCursor = "user:cursor",
  UserOperation = "user:operation",
  Snapshot = "server:snapshot",
}

/**
 * @public
 * Database Adapter Interface - This Interface should be implemented over Persistence Layer to have OT capabilities.
 */
export class WSAdapter implements IDatabaseAdapter {
  protected _emitter: Emitter<TDatabaseAdapterEventArgs> = mitt();
  protected _document: IPlainTextOperation = new PlainTextOperation();
  protected _pendingRevision: any
  protected _revision: number = 0 
  protected _ready: boolean = false
  protected _sent: TSentOperation | null = null

  protected _users = new Map<string, TUser>()

  public ws?: WebSocket
  public userId: string
  public userColor: string
  public userName: string
  public serverUrl: string

  constructor (options: TWSAdapterConstructionOptions) {
    this.userId = options.userId
    this.userColor = options.userColor
    this.userName = options.userName || this.userId
    this.serverUrl = options.serverUrl
    this.ws = this._initWebSocket()
  }

  protected _initWebSocket(): WebSocket {
    const ws = new WebSocket(`${this.serverUrl}?name=${this.userName}&color=${this.userColor}&userId=${this.userId}`)
    ws.onopen = () => {

    }
    ws.onclose = () => {
      // this._trigger(DatabaseAdapterEvent.Error, undefined)
    }

    ws.onmessage = ({ data }) => {
      const msg: any = JSON.parse(data)
      const { type, ...payload } = msg
      console.log("ws message", type, payload)
      switch (type) {
        case "user:connected": 
          this._users.set(payload.userId, { userColor: payload.userColor, userName: payload.userName })
          return this._trigger(DatabaseAdapterEvent.CursorChange, {
            clientId: payload.userId,
            cursor: payload.cursor,
            userColor: payload.userColor,
            userName: payload.userName,
          })

        case "user:disconnected": 
          this._users.delete(payload.userId)
          return this._trigger(DatabaseAdapterEvent.CursorChange, {
            clientId: payload.userId,
            cursor: null,
          })
          
        case "user:cursor": 
          const user = this._users.get(payload.userId)!
          return this._trigger(DatabaseAdapterEvent.CursorChange, {
            clientId: payload.userId,
            cursor: payload.cursor,
            userColor: user.userColor,
            userName: user.userName,
          })
 
        case "user:operation": return this._handleUserOperation(payload)
        case "server:snapshot": return this._handleSnapshot(payload.revison, payload.operations)
      }
    }

    return ws
  }

  protected _handleSnapshot (revision: number, operations: TPlainTextOperation[]) {
    console.log("snapshot", revision, operations)
    this._revision = revision || 0
    this._document = new PlainTextOperation()

    for(const operation of operations) {
      const op = PlainTextOperation.fromJSON(operation)
      this._document = this._document.compose(op)
    }
    
    this._trigger(DatabaseAdapterEvent.InitialRevision, undefined);
    this._trigger(DatabaseAdapterEvent.Operation, this._document);

    this._ready = true;

    // setTimeout(() => {
    this._trigger(DatabaseAdapterEvent.Ready, true);
    // });
  }

   /**
   * Apply incoming changes from newly added child in `history` node of Firebase ref.
   */
  protected _handleUserOperation({ userId, revision, operation }: TRevision): void {
    this._revision++
    console.log("operation", this._sent, userId, revision, operation)
    const op = PlainTextOperation.fromJSON(operation)
    if (!this._document.canMergeWith(op)) {
      console.log("Invalid operation", revision, op.toString)
      return;
    }
    this._document = this._document.compose(op);
    if (this._sent && revision === this._sent.revision) {
      this._trigger(DatabaseAdapterEvent.Acknowledge, undefined);
    } else {
      this._trigger(DatabaseAdapterEvent.Operation, op);
    }
  }

  dispose(): void {
    this.ws?.close(1000)
  }

  /**
   * Add listener to WA Adapter.
   * @param event - Event name.
   * @param listener - Event handler callback.
   */
  on<Key extends DatabaseAdapterEvent>(
    event: Key,
    listener: Handler<TDatabaseAdapterEventArgs[Key]>
  ) {
    return this._emitter.on(event, listener);
  }
  /**
   * Remove listener to WS Adapter.
   * @param event - Event name.
   * @param listener - Event handler callback (optional).
   */
  off<Key extends DatabaseAdapterEvent>(
    event: Key,
    listener?: Handler<TDatabaseAdapterEventArgs[Key]>
  ) {
    return this._emitter.off(event, listener);
  }

  /** Trigger an event with optional payload */
  protected _trigger<Key extends keyof TDatabaseAdapterEventArgs>(
    event: Key,
    payload: TDatabaseAdapterEventArgs[Key]
  ): void {
    console.log("trigger", event, payload)
    return this._emitter.emit(event, payload);
  }

  /**
   * Tests if any operation has been done yet on the document.
   */
  isHistoryEmpty(): boolean {
    return true
  }
  /**
   * Returns current state of the document (could be `null`).
   */
  getDocument(): IPlainTextOperation | null {
    return this._document;
  }
  /**
   * Add Unique Identifier against current user to mark Cursor and Operations.
   * @param userId - Unique Identifier for current user.
   */
  setUserId(userId: string): void {
    console.log("setUserId", userId)
  }
  /**
   * Set Color to mark current user's Cursor.
   * @param userColor - Hexadecimal Color code of current user's Cursor.
   */
  setUserColor(userColor: string): void {
    console.log("setUserColor", userColor)
  }
  /**
   * Set User Name to mark current user's Cursor.
   * @param userName - Name/Short Name of current user.
   */
  setUserName(userName: string): void {
    console.log("setUserName", userName)
  }
  /**
   * Tests if `clientId` matches current user's ID.
   * @param clientId - Unique Identifier for user.
   */
  isCurrentUser(clientId: string): boolean {
    console.log("isCurrentUser", clientId, this.userId)
    return this.userId === clientId
  }
  /**
   * Send operation, while retrying on connection failure. Returns a Promise with commited status.
   * An exception will be thrown on transaction failure, which should only happen on
   * catastrophic failure like a security rule violation.
   *
   * @param operation - Plain Text Operation to sent to server.
   */
  async sendOperation(operation: IPlainTextOperation): Promise<boolean> {
    console.log("sendOperation", operation.toString(), this._revision)
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) { return false }

    /** Sanity check that this operation is valid. */
    if (!this._document.canMergeWith(operation)) {
      const error = new InvalidOperationError(
        "sendOperation() called with an invalid operation."
      );
      this._trigger(DatabaseAdapterEvent.Error, {
        err: error,
        operation: operation.toString(),
        document: this._document.toString(),
      });
      throw error;
    }
    
    const value = operation.toJSON()
    this._sent = { revision: this._revision, operation }
    this.ws.send(JSON.stringify({ type: "operation:message", operation: value, revision: this._revision }))
    
    return true
  }
  /**
   * Send current user's cursor information to server. Returns an empty Promise.
   * @param cursor - Cursor of Current User.
   */
  async sendCursor(cursor: ICursor | null): Promise<void> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !cursor) { return }
    const { position = -1, selectionEnd = -1 } = cursor ? cursor.toJSON() : {}
    this.ws.send(JSON.stringify({ type: "cursor:message", position, selectionEnd }))
  }
}
