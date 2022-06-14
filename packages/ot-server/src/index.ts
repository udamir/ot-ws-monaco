import { App } from "uWebSockets.js"
import { Type } from "@sinclair/typebox"
import { Wsapix } from "wsapix"
import { ot } from "./ot"

const port = Number(process.env.PORT || "3000")
const server = App()

const wsx = Wsapix.uWS<any>({ server })

wsx.route(ot)

wsx.serverMessage({ type: "error" }, {
  $id: "error",
  description: "Backend error message",
  payload: Type.Strict(Type.Object({
    type: Type.String({ const: "error" }),
    message: Type.String(),
    code: Type.Optional(Type.Number())
  })),
})

wsx.on("error", (ctx, error) => {
  ctx.send({ type: "error", message: error })
  console.log(error)
})

server.get("/", (res) => {
  res.writeHeader('Content-Type', 'text/html').end(wsx.htmlDocTemplate("/wsapix"))
})

server.get("/wsapix", (res) => {
  res.writeHeader('Content-Type', 'application/json').end(wsx.asyncapi({
    info: {
      version: "1.0.0",
      title: "OT server websocket API"
    }
  }))
})

server.listen(port, () => {
  console.log(`Server listen port http://localhost:${port}`)
})
