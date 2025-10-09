import { Game } from "./game/game";

type GameMode = "singleplayer" | "multiplayer";

let game: Game | undefined;

const menu = document.getElementById("mode-menu");
const singleplayerButton = document.getElementById("start-singleplayer");
const multiplayerButton = document.getElementById("start-multiplayer");

const hideMenu = (): void => {
  menu?.classList.add("hidden");
};

const startGame = (mode: GameMode): void => {
  if (game) {
    return;
  }
  hideMenu();
  game = new Game({
    container: document.body,
    mode
  });
  void game.start();
};

singleplayerButton?.addEventListener("click", () => startGame("singleplayer"));
multiplayerButton?.addEventListener("click", () => startGame("multiplayer"));
