import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { keymap } from "prosemirror-keymap";
import { DOMParser, Schema } from "prosemirror-model";
import { schema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { exampleSetup } from "prosemirror-example-setup";
import { useEffect, useRef } from "react";
import {
  CursorAwareness,
  LoroCursorPlugin,
  LoroSyncPlugin,
  LoroUndoPlugin,
  undo,
  redo,
} from "loro-prosemirror";
import "./Editor.css";
import { Loro, LoroMap } from "loro-crdt";
import { buildMenuItems } from "./menu";

const mySchema = new Schema({
  nodes: addListNodes(schema.spec.nodes, "paragraph block*", "block"),
  marks: schema.spec.marks,
});

const doc = DOMParser.fromSchema(mySchema).parse(document.createElement("div"));

/* eslint-disable */
const plugins = exampleSetup({ schema: mySchema, history: false, menuContent: buildMenuItems(mySchema).fullMenu as any });

export function Editor({
  loro,
  awareness,
  onCreateLoro,
  fragment,
}: {
  loro?: Loro;
  awareness?: CursorAwareness;
  onCreateLoro?: (loro: Loro) => void;
  fragment?: LoroMap
}) {
  const editorRef = useRef<null | EditorView>(null);
  const editorDom = useRef(null);
  const loroRef = useRef(loro);
  if (loroRef.current && loro && loroRef.current !== loro) {
    throw new Error("loro ref cannot be changed");
  }

  loroRef.current = loro;

  useEffect(() => {
    if (editorRef.current) return;
    if (!loroRef.current) {
      loroRef.current = new Loro();
      onCreateLoro?.(loroRef.current);
    }

    const all = [
      ...plugins,
      // @ts-expect-error
      LoroSyncPlugin({ doc: loroRef.current!, fragment }),
      LoroUndoPlugin({ doc: loroRef.current! }),
      keymap({
        "Mod-z": state => undo(state, () => {}),
        "Mod-y": state => redo(state, () => {}),
        "Mod-Shift-z": state => redo(state, () => {}),
      }),
    ];
    if (awareness) {
      all.push(LoroCursorPlugin(awareness, {}));
    }
    editorRef.current = new EditorView(editorDom.current, {
      state: EditorState.create({ doc, plugins: all }),
    });
  }, [awareness, onCreateLoro]);

  return (
    <div id="editor" style={{ minHeight: 200, margin: 16 }} ref={editorDom} />
  );
}
