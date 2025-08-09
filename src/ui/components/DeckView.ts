import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { CardView } from "./CardView.ts";

// DeckView shows a face-down stack and supports drawing a card via pointer tap.
export class DeckView extends Container {
  private stackGfx: Graphics;
  private countText: Text;
  private cards: string[] = []; // store names for basic preview; integrate with Card later

  constructor(cardNames?: string[]) {
    super();
    this.eventMode = "static";
    this.cursor = "pointer";

    if (cardNames && cardNames.length) {
      this.cards = [...cardNames];
    }

    this.stackGfx = new Graphics();
    this.drawStack();
    this.addChild(this.stackGfx);

    this.countText = new Text({
      text: `${this.cards.length}`,
      style: new TextStyle({ fontFamily: "Arial", fontSize: 16, fill: 0xffffff })
    });
    this.countText.anchor.set(0.5);
    this.countText.position.set(40, 55);
    this.addChild(this.countText);

    this.on("pointertap", () => {
      const card = this.draw();
      if (card) {
        // emit a signal to parent with a new CardView instance
        const cv = new CardView({ name: card });
        this.emit("drawn", cv);
      }
    });
  }

  setCards(names: string[]) {
    this.cards = [...names];
    this.updateCount();
  }

  addCard(name: string) {
    this.cards.push(name);
    this.updateCount();
  }

  draw(): string | null {
    if (this.cards.length === 0) return null;
    const name = this.cards.pop()!;
    this.updateCount();
    return name;
  }

  get size() {
    return this.cards.length;
  }

  private updateCount() {
    this.countText.text = `${this.cards.length}`;
  }

  private drawStack() {
    // draw a simple stacked deck
    const w = 80;
    const h = 110;
    this.stackGfx.clear();
    for (let i = 0; i < 3; i++) {
      const g = new Graphics();
      g.roundRect(0 + i * 2, 0 + i * 2, w, h, 6).fill(0x444444).stroke({ color: 0x222222, width: 2 });
      this.stackGfx.addChild(g);
    }
  }
}
