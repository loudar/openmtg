import {startGameUI} from "./src/ui/GameUI.ts";

const win: any = window;
const doc: any = document;
if (win && doc) {
    await startGameUI();
}
