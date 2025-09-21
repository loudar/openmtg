import {Boardstate} from "./boardstate.ts";

export class GameSimulator {
    public static simulateGame(bs: Boardstate) {
        bs.startGame();

        while (bs.alivePlayerCount() > 1) {
            bs.nextTurn(bs.info.currentTurn);
            GameSimulator.autoRunTurnPhases(bs);
        }
    }

    public static autoRunTurnPhases(bs: Boardstate) {
        if (!bs.info.currentTurn) {
            throw new Error("Turn is empty. Make sure to start the game first");
        }

        const turn = bs.info.currentTurn;
        let currentPhase = turn.phases.at(0);
        while (currentPhase) {
            bs.info.currentTurn.currentPhase = currentPhase;
            GameSimulator.autoRunPhase(bs);

            if (bs.alivePlayerCount() <= 1) {
                return;
            }

            currentPhase = bs.nextPhase();
        }
    }

    public static autoRunPhase(bs: Boardstate) {
        if (!bs.info.currentTurn) {
            throw new Error("Turn is empty. Make sure to start the game first");
        }


    }
}