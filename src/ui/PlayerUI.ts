import {Container, Text, TextStyle} from "pixi.js";
import {StackView} from "./StackView.ts";
import {HandView} from "./HandView.ts";
import type {Player} from "../server/sessionTypes.ts";

export class PlayerUI extends Container {
    public setMaxHandWidth(width: number) {
        if (this.hand) {
            this.hand.setMaxWidth(width);
        }
    }
    public info: Player;
    public isSelf: boolean;

    public nameLabel: Text;
    public library: StackView;
    public hand?: HandView;
    public graveyard: StackView;
    public exile: StackView;

    constructor(info: Player, isSelf: boolean) {
        super();
        this.info = info;
        this.isSelf = isSelf;

        const nameText = new Text({
            text: info.name + (isSelf ? " (You)" : ""),
            style: new TextStyle({ fontFamily: "Arial", fontSize: 14, fill: 0xdddddd })
        });
        nameText.anchor.set(0.5);
        nameText.position.set(0, -90);
        this.nameLabel = nameText;
        this.addChild(nameText);

        // Build stacks. Library is face-down by default.
        this.library = new StackView("library", info.deck?.cards ?? []);
        this.library.setFaceDown(true);
        this.library.position.set(-140, -60);
        this.addChild(this.library);

        this.graveyard = new StackView("graveyard", []);
        this.graveyard.position.set(-40, -60);
        this.addChild(this.graveyard);

        this.exile = new StackView("exile", []);
        this.exile.position.set(60, -60);
        this.addChild(this.exile);

        this.hand = new HandView([]);
        this.hand.position.set(160, -60);
        this.addChild(this.hand);

        // Visibility rules: only local player's hand/GY/exile are revealed; others are face-down.
        if (!isSelf) {
            if (this.hand) {
                this.hand.setFaceDown(true);
            }
            this.graveyard.setFaceDown(true);
            this.exile.setFaceDown(true);
        } else {
            if (this.hand) {
                this.hand.setFaceDown(false);
            }
            this.graveyard.setFaceDown(false);
            this.exile.setFaceDown(false);
        }
    }
}
