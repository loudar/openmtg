import {DeckDownloader} from "../tools/DeckDownloader.ts";
import * as fs from "node:fs";

const input = `1x Aatchik, Emerald Radian (dft) 187 [Tokens]
1x Abaddon the Despoiler (40k) 2 *F* [Draw]
1x Chromatic Orrery (m21) 228 [Ramp]
1x Dragon's Hoard (tdc) 317 [Ramp]
1x Hazoret's Monument (dmc) 183 [Ramp]`;

const deck = await DeckDownloader.getFromString(input);
console.log(deck);
fs.writeFileSync("test.json", JSON.stringify(deck, null, 2));