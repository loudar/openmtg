import {Boardstate, type BoardstateInfo, DefaultZones} from "../boardstate.ts";
import {v4} from "uuid";
import {GameSimulator} from "../gameSimulator.ts";

const player1 = {
    id: v4(),
    hasLost: false,
    hasWon: false,
    commanderDamage: {},
    counters: {},
    life: 40,
    name: "test player 1",
    zones: DefaultZones,
};

const player2 = {
    id: v4(),
    hasLost: false,
    hasWon: false,
    commanderDamage: {},
    counters: {},
    life: 40,
    name: "test player 2",
    zones: DefaultZones,
};

const bs = new Boardstate();
bs.addPlayer(player1);
bs.addPlayer(player2);
GameSimulator.simulateGame(bs);
