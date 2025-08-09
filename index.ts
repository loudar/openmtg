/* eslint-env browser */
/* eslint-disable no-undef */
import React from "react";
import { createRoot } from "react-dom/client";
import { SessionApp } from "./src/ui/react/SessionApp.tsx";

const win: any = window;
const doc: any = document;
if (win && doc) {
    const rootEl = doc.createElement("div");
    rootEl.id = "root";
    doc.body.appendChild(rootEl);
    const root = createRoot(rootEl);
    root.render(React.createElement(SessionApp));
}
