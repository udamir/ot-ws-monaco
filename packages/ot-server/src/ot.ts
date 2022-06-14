import { WebSocket } from "uWebSockets.js"
import { WsapixChannel } from "wsapix"
import { Type, Static } from "@sinclair/typebox"
import { TextState } from "./text-state";

export type TCursor = {
  /** Starting Position of the Cursor/Selection */
  position: number;
  /** Final Position of the Selection */
  selectionEnd: number;
}

export interface IClientState {
  /** Unique User ID of Remote User */
  userId: string;
  /** JSON Representation of User Cursor/Selection */
  cursor: TCursor | null;
  /** Color String (Hex, HSL, RGB, Text etc.) for Cursor/Selection. */
  userColor?: string;
  /** Name/Short Name of the Remote User */
  userName?: string;
  /** Requested revision */
  revision?: number
}

const state = new TextState("test message")

export const ot = new WsapixChannel<WebSocket, IClientState>({ path: "/ot" })

ot.use((client) => {
  // check auth
  if (!client.query) {
    client.send({ type: "error", message: "Wrong token!", code: 401 })
    return client.terminate(4003)
  }
  const params = Object.fromEntries(
    client.query.split("&").filter((p) => !!p).map((p) => p.split("="))
  )
  const userId = decodeURI(params.userId) || client.headers['sec-websocket-key'] as string
  const userName = decodeURI(params.name)
  const userColor = decodeURI(params.color)
  const revision = isNaN(+params.revision || 0) ? +params.revision : 0
  client.state = { userId, userName, userColor, cursor: null, revision }
})

/* Client messages */

export const operationType = Type.Array(Type.Union([
  Type.String(),
  Type.Number(),
  Type.Record(Type.String(), Type.Any(), { description: "Additional Metadata Data Type for Text Operation" })
]), { description: "Text Operation data" })


// cursor message from client
export const cursorMessageSchema = {
  $id: "cursor:message",
  description: "Cursor message",
  payload: Type.Strict(Type.Object({
    type: Type.String({ const: "cursor:message", description: "Message type" }),
    position: Type.Number({ description: "Cursor position" }),
    selectionEnd: Type.Number({ description: "Final Position of the Selection" }),
  }, { $id: "cursor:message" }))
}

export type CursorMessageSchema = Static<typeof cursorMessageSchema.payload>

ot.clientMessage<CursorMessageSchema>({ type: "cursor:message"}, cursorMessageSchema, (client, data) => {
  ot.clients.forEach((c) => {
    if (c === client) { return } 
    c.send({
      type: "user:cursor",
      userId: client.state.userId,
      cursor: {
        position: data.position,
        selectionEnd: data.selectionEnd
      }
    })
  })
})

// operation message from client
export const operationMessageSchema = {
  $id: "operation:message",
  description: "Operation message",
  payload: Type.Strict(Type.Object({
    type: Type.String({ const: "operation:message", description: "Message type" }),
    revision: Type.Number(),
    operation: operationType
  }, { $id: "operation:message" }))
}

export type OperationMessageSchema = Static<typeof operationMessageSchema.payload>

ot.clientMessage<OperationMessageSchema>({ type: "operation:message"}, operationMessageSchema, (client, data) => {
  ot.clients.forEach((c) => {
    c.send({
      type: "user:operation",
      userId: client.state.userId,
      revision: data.revision,
      operation: data.operation
    })
  })
  state.clientOperation(data.operation)
})

/* Server messages */

// User cursor message

export const userCursorMessageSchema = {
  $id: "user:cursor",
  description: "User cursor message",
  payload: Type.Strict(Type.Object({
    type: Type.String({ const: "user:cursor", description: "Message type" }),
    userId: Type.String({ description: "User Id" }),
    cursor: Type.Optional(Type.Object({
      position: Type.Number({ description: "Cursor position" }),
      selectionEnd: Type.Number({ description: "Final Position of the Selection" }),
    }, { description: "User name" })),
  }, { $id: "user:cursor" }))
}

ot.serverMessage({ type: "user:cursor" }, userCursorMessageSchema)

// User operation message

export const userOperationMessageSchema = {
  $id: "user:operation",
  description: "User operation message",
  payload: Type.Strict(Type.Object({
    type: Type.String({ const: "user:operation", description: "Message type" }),
    userId: Type.String({ description: "User Id" }),
    operation: operationType,
  }, { $id: "user:operation" }))
}

ot.serverMessage({ type: "user:operation" }, userOperationMessageSchema)

// User connect message

export const userConnectedSchema = {
  $id: "user:connected",
  description: "User online status update",
  payload: Type.Strict(Type.Object({
    type: Type.String({ const: "user:connected", description: "Message type" }),
    userId: Type.String({ description: "User id" }),
    userName: Type.String({ description: "User name" }),
    cursor: Type.Optional(Type.Object({
      position: Type.Number({ description: "Cursor position" }),
      selectionEnd: Type.Number({ description: "Final Position of the Selection" }),
    }, { description: "User name" })),
    userColor: Type.String({ description: "User color" }),
  }, { $id: "user:connected" }))
}

ot.serverMessage({ type: "user:connected" }, userConnectedSchema)

// Server snapshot message

export const serverSnapshotSchema = {
  $id: "server:snapshot",
  description: "Snapshot of server state",
  payload: Type.Strict(Type.Object({
    type: Type.String({ const: "server:snapshot", description: "Message type" }),
    document: Type.Optional(Type.String({ description: "Base document" })),
    operations: Type.Array(operationType, { description: "User name" }),
  }, { $id: "server:snapshot" }))
}

ot.serverMessage({ type: "server:snapshot" }, serverSnapshotSchema)

// User disconnect message

export const userDisconnectedSchema = {
  $id: "user:disconnected",
  description: "User online status update",
  payload: Type.Strict(Type.Object({
    type: Type.String({ const: "user:disconnected", description: "Message type" }),
    userId: Type.String({ description: "User Id" }),
  }, { $id: "user:disconnected" }))
}

ot.serverMessage({ type: "user:disconnected" }, userDisconnectedSchema)

// Channel handlers

ot.on("connect", (client) => {
      ot.clients.forEach((c) => {
    if (c === client) { return }
    c.send({ type: "user:connected", ...client.state })
    client.send({ type: "user:connected", ...c.state })
  })
  const revision = client.state.revision || 0
  client.send({
    type: "server:snapshot",
    revision: state.revision,
    document: state.getSnapshot(revision),
    operations: state.getOperations(revision)
  })
})

ot.on("disconnect", (client) => {
  ot.clients.forEach((c) => {
    if (c === client) { return } 
    c.send({ type: "user:disconnected", userId: client.state.userId })
  })
})
