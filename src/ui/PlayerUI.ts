import {Container, Text, TextStyle} from "pixi.js";
import {StackView} from "./StackView.ts";

export interface PlayerInfo {
    id: string;
    name: string;
    deckSize?: number;
}

export class PlayerUI extends Container {
    public info: PlayerInfo;
    public isLocal: boolean;

    public nameLabel: Text;
    public library: StackView;
    public hand: StackView;
    public graveyard: StackView;
    public exile: StackView;

    constructor(info: PlayerInfo, isLocal: boolean, sampleCards?: string[]) {
        super();
        this.info = info;
        this.isLocal = isLocal;

        const nameText = new Text({
            text: info.name + (isLocal ? " (You)" : ""),
            style: new TextStyle({ fontFamily: "Arial", fontSize: 14, fill: 0xdddddd })
        });
        nameText.anchor.set(0.5);
        nameText.position.set(0, -90);
        this.nameLabel = nameText;
        this.addChild(nameText);

        // Build stacks. Library is face-down by default.
        this.library = new StackView("library", sampleCards ?? []);
        this.library.setFaceDown(true);
        this.library.position.set(-140, -60);
        this.addChild(this.library);

        this.graveyard = new StackView("graveyard", []);
        this.graveyard.position.set(-40, -60);
        this.addChild(this.graveyard);

        this.exile = new StackView("exile", []);
        this.exile.position.set(60, -60);
        this.addChild(this.exile);

        this.hand = new StackView("hand", []);
        this.hand.position.set(160, -60);
        this.addChild(this.hand);

        // Visibility rules: only local player's hand/GY/exile are revealed; others are face-down.
        if (!isLocal) {
            this.hand.setFaceDown(true);
            this.graveyard.setFaceDown(true);
            this.exile.setFaceDown(true);
        } else {
            this.hand.setFaceDown(false);
            this.graveyard.setFaceDown(false);
            this.exile.setFaceDown(false);
        }
    }
}
