/* jshint -W104 */
/* jshint esversion:6 */
const express = require('express'); // using express 
const socketIO = require('socket.io');
const http = require('http');
var fs = require('fs');
const port = 5231; // setting the port  
let app = express();
let server = http.createServer(app);
let io = socketIO(server);

var DICE_ROLLED = 6;
var DICE = {
    MIN: 1,
    MAX: 6,
}

var html = fs.readFileSync('index.html', 'utf8');
var js = fs.readFileSync('test.js', 'utf8');

class Game {
    constructor() {
        this.players = [];
        this.started = false;
        this.playerTurn = 0;
        this.callChain = [];

        this.round = 1;
    }

    addUser(user) {
        this.players.push(user);
    }

    start() {
        this.started = true;
    }

    sendAllEvent(event) {
        this.players.forEach((player) => {
            player.socket.emit(event);
        });
    }

    sendAllEventMessage(event, message) {
        this.players.forEach((player) => {
            player.socket.emit(event, message);
        });
    }

    toJsonHappy() {
        var players = [];
        this.players.forEach((player, i) => {
            var a = player.toJsonHappy();
            a.playerNumber = i;
            players.push(a);
        });
        return {
            playerTurn: this.playerTurn,
            callChain: this.callChain,
            players: players,
        };
    }

    toJsonHappyPrivate() {
        var players = [];
        this.players.forEach((player, i) => {
            var a = player.toJsonHappyPrivate();
            a.playerNumber = i;
            players.push(a);
        });
        return {
            playerTurn: this.playerTurn,
            callChain: this.callChain,
            players: players,
        };
    }

    getJsonHappyPlayerList() {
        var players = [];
        this.players.forEach((player, i) => {
            var a = player.toJsonHappy();
            a.playerNumber = i;
            players.push(a);
        });
        return players;
    }

    removeSocket(id) {
        const i = this.players.findIndex((player) => player.socket.id == id);
        this.players.splice(i, 1);
    }

    disconnectAll() {
        this.players.forEach((player) => {
            player.socket.disconnect();
        });
    }

    clearPlayers() {
        this.disconnectAll();
        this.players = [];
    }

    call(num, numOfNums) {
        this.callChain.push({
            player: this.playerTurn,
            num: num,
            numOfNums: numOfNums,
        });
        this.playerTurn++;
        this.playerTurn %= this.players.length;
    }

    reset() {
        this.players.forEach((player) => {
            player.ready = false;
            player.rolled = false;
            player.rolledValues = [];
        });
        this.started = false;
    }
}

class Player {
    constructor(socket) {
        this.socket = socket;
        this.rolled = false;

        this.rolledValues = [];

        this.ready = false;
        this.name = "";

        this.score = 0;

        this.playerNum = -1;
    }

    readyUp() {
        this.ready = !this.ready;
    }

    isReady() {
        return this.ready;
    }

    roll() {
        this.rolled = true;
        this.rolledValues = [];
        for (var i = 0; i < DICE_ROLLED; i++) {
            this.rolledValues.push(Math.floor((DICE.MAX - DICE.MIN + 1) * Math.random()) + 1);
        }
    }

    toJsonHappy() {
        return {
            rolled: this.rolled,
            name: this.name,
            ready: this.ready,
            score: this.score,
        };
    }

    toJsonHappyPrivate() {
        return {
            rolled: this.rolled,
            rolledValues: this.rolledValues,
            name: this.name,
            ready: this.ready,
            score: this.score,
        };
    }
}

server.listen(port);

var game = new Game();


console.log("Connect by using http://localhost:5231/");

// make a connection with the user from server side
io.of("/game").on('connection', (socket) => {
    if (!game.started) {
        var player = new Player(socket);

        socket.on("name", (msg) => {

            if (game.players.some((player) => {
                    return player.name == msg;
                })) {
                socket.emit("heavy-error", "Somebody already has that name!");
                socket.disconnect();
                return;
            }

            socket.emit("room-join");

            player.name = msg;
            console.log("player name: " + msg);
            game.addUser(player);

            game.sendAllEventMessage("player-list", JSON.stringify(game.getJsonHappyPlayerList()));


            socket.on("ready", () => {
                console.log(player.name + " readied up!");
                player.readyUp();
                game.sendAllEventMessage("player-list", JSON.stringify(game.getJsonHappyPlayerList()));

                if (game.players.length <= 1) {
                    return;
                }

                var gameStart = true;
                for (var i = 0; i < game.players.length; i++) {
                    if (!game.players[i].isReady()) {
                        gameStart = false;
                        break;
                    }
                }

                if (gameStart) {
                    game.start();
                    game.sendAllEvent("start");
                    game.sendAllEventMessage("player-list", JSON.stringify(game.getJsonHappyPlayerList()));

                    game.players.forEach((player, i) => {
                        player.socket.emit("player-num", i);
                    });
                }
            });

            socket.on("roll", (msg) => {
                if (game.started) {
                    if (!player.rolled) {
                        player.roll();
                        game.sendAllEventMessage("player-list", JSON.stringify(game.getJsonHappyPlayerList()));
                        socket.emit("roll", player.rolledValues);

                        var a = game.players.some((player) => player.rolled == false);
                        if (!a) {
                            game.sendAllEventMessage("bluff-game-state", JSON.stringify(game.toJsonHappy()));
                            game.sendAllEvent("enter-bluff");
                        }
                    } else {
                        socket.emit("slight-error", "You've rolled already!");
                    }
                } else {
                    socket.emit("slight-error", "Game hasn't Started yet");
                }
            });

            socket.on("chat", (msg) => {
                game.sendAllEventMessage("chat", msg);
            });

            socket.on("call", (num, numOfNums) => {
                if (socket.id == game.players[game.playerTurn].socket.id) {
                    game.call(num, numOfNums);
                    game.sendAllEventMessage("bluff-game-state", JSON.stringify(game.toJsonHappy()));
                } else {
                    socket.emit("slight-error", "It's not your turn!");
                }
            });

            socket.on("bluff", () => {

                if (socket.id != game.players[game.playerTurn].socket.id) {
                    socket.emit("slight-error", "It's not your turn!");
                    return;
                }

                if (game.callChain.length == 0) {
                    socket.emit("slight-error", "First player must call something!");
                    return;
                }
                const lastCall = game.callChain[game.callChain.length - 1];

                var diceNum = lastCall.num;
                var count = 0;

                if (game.callChain.some((call) => call.num == 1)) {
                    game.players.forEach((player) => {
                        player.rolledValues.forEach((num) => {
                            if (num == diceNum) {
                                count++;
                            }
                        });
                    });
                } else {
                    game.players.forEach((player) => {
                        player.rolledValues.forEach((num) => {
                            if (num == diceNum || num == 1) {
                                count++;
                            }
                        });
                    });
                }

                if (count < lastCall.numOfNums) {
                    game.players[game.playerTurn].score++;
                } else {
                    game.players[game.playerTurn].score--;
                }

                var gameState = game.toJsonHappyPrivate();

                gameState.didWin = count > lastCall.numOfNums;
                gameState.playerInvolved = game.playerTurn;

                game.sendAllEventMessage("end-game-state", gameState);
                game.reset();
                game.sendAllEventMessage("player-list", JSON.stringify(game.getJsonHappyPlayerList()));
            });

            socket.on("disconnect", () => {
                console.log(player.name + " has disconnected!");

                game.removeSocket(socket.id);
                game.sendAllEventMessage("player-list", JSON.stringify(game.getJsonHappyPlayerList()));

                if (game.started && game.players.length <= 1) {
                    game.sendAllEvent("heavy-error", "All opponents have left!");
                    game.clearPlayers();
                    game = new Game();
                }
            });
        });
    } else {
        socket.emit("game-started-already");
        socket.disconnect();
    }
});

app.get('/', (req, res) => res.send(html));

app.get('/test.js', (req, res) => res.send(js));