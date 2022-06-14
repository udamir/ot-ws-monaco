import * as monaco from "monaco-editor";
import { v4 as uuid } from "uuid";
import { IWSMonacoEditor } from "./ws-monaco";
import { EditorClientEvent } from "./ws-monaco/plaintext-editor";

/**
 * Augment Global Namespace to enable Cache and Hot Module Replacement logic.
 */
declare global {
  interface Window {
    monacoEditor?: monaco.editor.IStandaloneCodeEditor;
    wsMonaco?: IWSMonacoEditor;
  }
  interface NodeModule {
    hot?: {
      accept(path: string, callback: Function): void;
    };
  }
}

/**
 * Cleanup
 */
window.monacoEditor = undefined;
window.wsMonaco = undefined;

/**
 * Generate Random Integer
 */
const randInt = (limit: number = 1) => (Math.random() * limit) | 0;

/** User Color */
const userColor = `rgb(${randInt(255)}, ${randInt(255)}, ${randInt(255)})`;

/** User Id */
const userId = uuid();

/** User Name */
const userName = `Anonymous ${randInt(100)}`;

/**
 * @returns - Monaco Editor instance.
 */
const getEditorInstance = (): monaco.editor.IStandaloneCodeEditor => {
  if (window.monacoEditor) {
    return window.monacoEditor;
  }

  const editor = monaco.editor.create(document.getElementById("editor")!, {
    fontSize: 18,
    language: "plaintext",
    minimap: {
      enabled: false,
    },
    readOnly: true,
    theme: "vs-dark",
    trimAutoWhitespace: false,
  });

  window.addEventListener("resize", () => {
    editor.layout();
  });

  window.monacoEditor = editor;
  return editor;
};

/**
 * Handle Creation of Collaborative Editor.
 */
const onDocumentReady = (): void => {
  const editor = getEditorInstance();

  if (window.wsMonaco) {
    console.log("Changes detected, recreating editor.");
    editor.updateOptions({ readOnly: true });
    window.wsMonaco.dispose();
  }

  const { WSMonacoEditor } = require("./ws-monaco");
  const serverUrl = "ws://localhost:3000/ot"

  const wsMonaco = new WSMonacoEditor({
    announcementDuration: Infinity,
    serverUrl,
    editor,
    userId,
    userColor,
    userName,
  });

  wsMonaco.on(EditorClientEvent.Ready, () => {
    editor.updateOptions({ readOnly: false });
  });

  window.wsMonaco = wsMonaco;
};

/**
 * Register timer for main app.
 */
setTimeout(onDocumentReady, 1);

/**
 * Handle module.hot replacement.
 */
if (module.hot) {
  module.hot.accept("./ws-monaco", onDocumentReady);
}

export {};
