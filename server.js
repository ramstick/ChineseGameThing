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
var js = fs.readFileSync('script.js', 'utf8');

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

        this.takeTurn();
    }

    takeTurn() {
        this.playerTurn++;
        this.playerTurn %= this.players.length;
        this.checkDisconnect();
    }

    checkDisconnect() {
        if (this.players[this.playerTurn].disconnect) {
            this.takeTurn();
        }
    }

    reset() {
        this.players.forEach((player) => {
            player.ready = false;
            player.rolled = false;
            player.rolledValues = [];
        });
        this.playerTurn = 0;
        this.started = false;
        this.callChain = [];
        this.lastCall = null;
    }

    reorderPlayers(numAtTop) {
        swap(this.players, numAtTop, 0);
        for (var i = Math.random() * 10 + 1; i >= 0; i--) {
            swap(this.players, Math.floor(Math.random() * (this.players.length - 1) + 1), Math.floor(Math.random() * (this.players.length - 1) + 1));
        }
    }
}

function swap(arr, a, b) {
    var temp = arr[a];
    arr[a] = arr[b];
    arr[a] = temp;
}

class Player {
    constructor(socket) {
        this.socket = socket;
        this.rolled = false;

        this.disconnect = false;

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
            disconnect: this.disconnect,
        };
    }

    toJsonHappyPrivate() {
        return {
            rolled: this.rolled,
            rolledValues: this.rolledValues,
            name: this.name,
            ready: this.ready,
            score: this.score,
            disconnect: this.disconnect,
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
            console.log(msg, " has joined");
            game.addUser(player);

            game.sendAllEventMessage("player-list", game.getJsonHappyPlayerList());
            game.sendAllEvent("update");


            socket.on("ready", () => {
                console.log(player.name + " readied up!");
                player.readyUp();
                game.sendAllEventMessage("player-list", game.getJsonHappyPlayerList());
                game.sendAllEvent("update");

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

                    console.log("--------------------- GAME STARTING --------------------------");
                    console.log("Players : ", game.getJsonHappyPlayerList());

                    game.start();
                    game.sendAllEvent("start");
                    game.sendAllEventMessage("player-list", game.getJsonHappyPlayerList());
                    game.sendAllEvent("update");

                    game.players.forEach((player, i) => {
                        player.socket.emit("player-num", i);
                    });
                }
            });

            socket.on("roll", (msg) => {
                if (game.started) {
                    if (!player.rolled) {
                        player.roll();

                        game.sendAllEventMessage("player-list", game.getJsonHappyPlayerList());
                        game.sendAllEvent("update");

                        socket.emit("roll", player.rolledValues);
                        socket.emit("update");

                        var a = game.players.some((player) => player.rolled == false);
                        if (!a) {
                            console.log("+++++++++++++++++++ ALL PLAYERS HAVE ROLLED +++++++++++++++++++++");
                            console.log(game.getJsonHappyPlayerList());
                            game.sendAllEventMessage("game-board-state", game.toJsonHappy());
                            game.sendAllEventMessage("player-list", game.getJsonHappyPlayerList());
                            game.sendAllEvent("enter-bluff");
                            game.sendAllEvent("update");
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
                    console.log(game.playerTurn, " raised it to ", numOfNums, " ", num, "'s");
                    game.call(num, numOfNums);
                    game.sendAllEventMessage("game-board-state", game.toJsonHappy());
                    game.sendAllEventMessage("player-list", game.getJsonHappyPlayerList());
                    game.sendAllEvent("update");
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

                gameState.didWin = count < lastCall.numOfNums;
                gameState.playerInvolved = game.playerTurn;

                game.sendAllEvent("game-end");
                game.sendAllEventMessage("game-board-state", gameState);
                game.sendAllEvent("update");
                console.log(game.toJsonHappy());

                game.reset();
                game.reorderPlayers(game.playerTurn);

                game.sendAllEventMessage("player-list", game.getJsonHappyPlayerList());
                game.sendAllEvent("update");
            });

            socket.on("disconnect", () => {
                console.log(player.name + " has disconnected!");

                if (game.started) {
                    player.disconnect = true;
                    var num_online = 0;
                    game.players.forEach((player) => {
                        if (!player.disconnect) {
                            num_online++;
                        }
                    });
                    if (num_online <= 1) {
                        game.sendAllEvent("heavy-error", "All opponents have left!");
                        game.clearPlayers();
                        console.log("all players have left, cleaning up the game");
                        game = new Game();
                        return;
                    } else {
                        game.playerTurn %= game.players.length;
                        game.checkDisconnect();
                    }
                } else {
                    game.removeSocket(socket.id);
                }

                game.sendAllEventMessage("player-list", game.getJsonHappyPlayerList());
                game.sendAllEvent("update");
            });
        });
    } else {
        socket.emit("game-started-already");
        socket.disconnect();
    }
});

app.get('/', (req, res) => res.send(html));

app.get('/script.js', (req, res) => res.send(js));