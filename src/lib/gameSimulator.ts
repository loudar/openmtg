import {Boardstate, Phase} from "./boardstate.ts";

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
            console.log(`[TURN] ${bs.info.currentTurn.round}\t[PHASE] ${currentPhase}`);

            GameSimulator.autoRunPhase(bs);

            console.log(`[ALIVE] ${bs.alivePlayerCount()}`);
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

        switch (bs.info.currentTurn.currentPhase) {
            case Phase.Untap:
                break;
            case Phase.Upkeep:
                break;
            case Phase.Draw:
                bs.playerDrawCard();
                break;
            case Phase.Main:
                break;
            case Phase.CombatStart:
                break;
            case Phase.CombatAttack:
                break;
            case Phase.CombatBlock:
                break;
            case Phase.CombatStrike:
                break;
            case Phase.CombatDamage:
                break;
            case Phase.CombatEnd:
                break;
            case Phase.End:
                break;
            case Phase.Cleanup:
                break;
        }

        bs.checkForWins();
    }
}