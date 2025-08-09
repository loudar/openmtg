/* eslint-env browser */
/* eslint-disable no-undef */
import { renderSessionUI } from "./src/ui/SessionUI.ts";

const win: any = window;
const doc: any = document;
if (win && doc) {
    renderSessionUI(doc.body);
}
