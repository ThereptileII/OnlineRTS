import { Game } from "./game/game.js";

let game;

const menu = document.getElementById("mode-menu");
const singleplayerButton = document.getElementById("start-singleplayer");
const multiplayerButton = document.getElementById("start-multiplayer");

const hideMenu = () => {
  menu?.classList.add("hidden");
};

const startGame = mode => {
  if (game) {
    return;
  }
  hideMenu();
  game = new Game({
    container: document.body,
    mode
  });
  game.start();
};

singleplayerButton?.addEventListener("click", () => startGame("singleplayer"));
multiplayerButton?.addEventListener("click", () => startGame("multiplayer"));
