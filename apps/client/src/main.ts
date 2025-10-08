import { Game } from "./game/game";

const game = new Game({
  container: document.body
});

void game.start();
