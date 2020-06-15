/* jshint -W104 */
/* jshint esversion: 6 */

const Room = {
    START: 0,
    WAIT: 1,
    ROLL: 2,
    BLUFF: 3,
    END: 4,
};

var currentRoom = Room.START;

var socket;

var sleepTimeouts;

function onload() {
    $("#start").show();
    $("#roll").hide();
    $("#bluff").hide();
    $("#waitroom").hide();
    $("#rollroom-info").hide();
    $("#round-end").hide();
    currentRoom = Room.START;

    setupPlayerLists();
    reset();
}


function reset() {
    $(".dice-roll-disp").empty();
    $(".dice-roll-disp").hide();
    $("#roll-button").show();
    $("#rollroom-info").hide();
}

function setupPlayerLists() {
    $(".player-list-status").html("<thead class='player-list-head'><tr><th>Connected Players</th><th>Score</th><th style='justify-content: right;'>Status</th></tr></thead><tbody class='player-list-body-readied'></tbody>");
    $(".player-list-rolled").html("<thead class='player-list-head'><tr><th>Connected Players</th><th>Score</th><th style='justify-content: right;'>Rolled</th></tr></thead><tbody class='player-list-body-rolled'></tbody>");
    $(".player-list").html("<thead class='player-list-head'><tr><th>Connected Players</th><th>Score</th></tr></thead><tbody class='player-list-body'></tbody>");
}

function connect() {
    if (socket) {
        socket.disconnect();
    }
    socket = io("http://localhost:5231");

    sleepTimeouts = setInterval(() => {
        socket.emit("timeout", "yeetus deletus");
    }, 10000);

    var playerNum = -1;

    var playerName = document.getElementById("name").value;

    $(".player-name").html(document.getElementById("name").value);

    console.log(document.getElementById("name").value);

    socket.on("game-started-already", () => {
        console.log("Game Started");
        enterStartroom();
    });
    socket.emit("name", document.getElementById("name").value);

    socket.on("chat", (msg) => {
        var msgTableWrapper = document.createElement("tr");
        msgTableWrapper.textContent = msg;
        document.getElementById("chat").appendChild(msgTableWrapper);
    });

    socket.on("start", () => {
        console.log("game has started");
        enterRoll();
    });

    socket.on("slight-error", (msg) => {
        console.log("Slight Error: " + msg);
    });

    socket.on("heavy-error", (msg) => {
        console.log("Heavy Error: " + msg);
    });

    socket.on("roll", (rolled) => {
        $("#roll-button").hide();
        var inner = "";
        rolled.forEach((diceRoll) => {
            inner += `<h3 class='col' style='text-align:center;'>${diceRoll}</h3>`;
        });
        $(".dice-roll-disp").html(inner);
        $("#rollroom-info").show();
        $(".dice-roll-disp").show();
    });

    socket.on("enter-bluff", () => {
        enterBluff();
    });

    socket.on("player-list", (playerList) => {
        const players = JSON.parse(playerList);

        if (players.length <= 1) {
            $("#waitroom-info").html("You're in here alone, get some friends on!");
        } else {
            $("#waitroom-info").html("Waiting for all players to ready up!");
        }
        var table = $(".player-list-body-readied");
        table.empty();
        players.forEach((player) => {
            var tableRow = $("<tr></tr>", {});
            var tableData = $("<td></td>");
            var statusData = $("<td></td>");
            var score = $("<td></td>");
            if (player.ready) {
                statusData.html('<svg class="bi bi-check" width="1.2em" height="1.2em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.236.236 0 0 1 .02-.022z"/></svg>');
                statusData.addClass("text-success");
            } else {
                statusData.html('<svg class="bi bi-x" width="1.2em" height="1.2em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M11.854 4.146a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708-.708l7-7a.5.5 0 0 1 .708 0z"/><path fill-rule="evenodd" d="M4.146 4.146a.5.5 0 0 0 0 .708l7 7a.5.5 0 0 0 .708-.708l-7-7a.5.5 0 0 0-.708 0z"/></svg>');
                statusData.addClass("text-danger");
            }
            score.html(player.score);
            tableData.text(player.name);
            tableRow.append(tableData);
            tableRow.append(score);
            tableRow.append(statusData);
            table.append(tableRow);
        });
        var table = $(".player-list-body-rolled");
        table.empty();
        players.forEach((player) => {
            var tableRow = $("<tr></tr>", {});
            var tableData = $("<td></td>");
            var statusData = $("<td></td>");
            var score = $("<td></td>");
            if (player.rolled) {
                statusData.html('<svg class="bi bi-check" width="1.2em" height="1.2em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.236.236 0 0 1 .02-.022z"/></svg>');
                statusData.addClass("text-success");
            } else {
                statusData.html('<svg class="bi bi-x" width="1.2em" height="1.2em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M11.854 4.146a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708-.708l7-7a.5.5 0 0 1 .708 0z"/><path fill-rule="evenodd" d="M4.146 4.146a.5.5 0 0 0 0 .708l7 7a.5.5 0 0 0 .708-.708l-7-7a.5.5 0 0 0-.708 0z"/></svg>');
                statusData.addClass("text-danger");
            }
            score.html(player.score);
            tableData.text(player.name);
            tableRow.append(tableData);
            tableRow.append(score);
            tableRow.append(statusData);
            table.append(tableRow);
        });
    });

    socket.on("bluff-game-state", (gameJSON) => {
        const game = JSON.parse(gameJSON);

        if (game.callChain.length == 0) {
            $("#number-of-numbers").attr("max", game.players.length * 6);
            $("#number-of-numbers").attr("min", 1);
            $("#last-raise-info").hide();
            $("#dice-number").empty();
            $("#dice-number").html("<option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option>");
            $("#bluff-button").addClass("disabled");
        } else {
            const lastCall = game.callChain[game.callChain.length - 1];
            $("#last-raise-info").show();
            $("#last-raise-info").text(`${game.players[lastCall.player].name} last called out ${lastCall.numOfNums} ${lastCall.num}'s`);
            $("#number-of-numbers").attr("min", lastCall.numOfNums + 1);
            $("#number-of-numbers").attr("val", lastCall.numOfNums + 1);
            $("#dice-number").empty();
            var a = "";
            for (var i = lastCall.num; i <= 6; i++) {
                a += "<option>" + i + "</option>";
            }
            $("#dice-number").html(a);
            $("#bluff-button").removeClass("disabled");
        }

        var table = $(".player-list-body");
        table.empty();
        game.players.forEach((player, i) => {
            var tableRow = $("<tr></tr>", {});
            var tableData = $("<td></td>");
            var score = $("<td></td>");
            if (i == game.playerTurn) {
                tableRow.addClass("table-success");
            }
            score.html(player.score);
            tableData.text(player.name);
            tableRow.append(tableData);
            tableRow.append(score);
            table.append(tableRow);
        });

        if (game.playerTurn == playerNum) {
            $("#raise-button").removeClass("disabled");
            if ($("#bluff-button").hasClass("disabled"))
                $("#bluff-button").removeClass("disabled");

        } else {
            $("#raise-button").addClass("disabled");
            $("#bluff-button").addClass("disabled");
        }
    });

    socket.on("end-game-state", (gameState) => {

        var table = $(".player-list-body");
        table.empty();
        gameState.players.forEach((player, i) => {
            var tableRow = $("<tr></tr>", {});
            var tableData = $("<td></td>");
            var score = $("<td></td>");
            score.html(player.score);
            tableData.text(player.name);
            tableRow.append(tableData);
            tableRow.append(score);
            table.append(tableRow);
        });

        $("#all-roll-disp").empty();
        var html = "";
        gameState.players.forEach((player) => {
            html += "<tr><th>" + player.name + "</th>";
            player.rolledValues.forEach((num) => {
                html += "<td>" + num + "</td>";
            });
            html += "</tr>";
        });
        const lastCall = gameState.callChain[gameState.callChain.length - 1];
        $("#last-call").text(`${gameState.players[lastCall.player].name} last called ${lastCall.numOfNums} ${lastCall.num}'s!`);

        if (gameState.players[gameState.playerInvolved].name == playerName) {
            if (gameState.didWin) {
                $("#win-lose").text(`You won!`);
            } else {
                $("#win-lose").text(`You lost!`);
            }
        } else {

            if (gameState.didWin) {
                $("#win-lose").text(`${gameState.players[gameState.playerInvolved].name} won!`);
            } else {
                $("#win-lose").text(`${gameState.players[gameState.playerInvolved].name} lost!`);
            }
        }

        $("#all-roll-disp").html(html);

        enterRoundEnd();
    });

    socket.on("room-join", () => {
        enterWaitroom();
    });

    socket.on("disconnect", () => {
        onload();
        reset();
        socket = null;
        clearInterval(sleepTimeouts);
    });

    socket.on("player-num", (num) => {
        playerNum = num;
    });
}

function enterWaitroom() {
    currentRoom = Room.WAIT;
    $("#roll").hide();
    $("#bluff").hide();
    $("#waitroom").show();
    $("#start").hide();
    $("#round-end").hide();
}

function enterStartroom() {
    currentRoom = Room.START;
    $("#roll").hide();
    $("#bluff").hide();
    $("#waitroom").hide();
    $("#start").show();
    $("#round-end").hide();
}

function enterRoll() {
    currentRoom = Room.ROLL;
    $("#roll").show();
    $("#bluff").hide();
    $("#waitroom").hide();
    $("#start").hide();
    $("#round-end").hide();
}

function enterBluff() {
    currentRoom = Room.BLUFF;
    $("#roll").hide();
    $("#bluff").show();
    $("#waitroom").hide();
    $("#start").hide();
    $("#round-end").hide();
}

function enterRoundEnd() {
    currentRoom = Room.END;
    $("#roll").hide();
    $("#bluff").hide();
    $("#waitroom").hide();
    $("#start").hide();
    $("#round-end").show();
}

function ready() {
    if (socket) {
        socket.emit("ready");
    } else {
        console.log("You havent connected yet!");
    }
}

function send(message) {
    if (socket) {
        socket.emit("chat", message);
    } else {
        console.log("You havent connected yet!");
    }
}

function roll() {
    if (socket) {
        socket.emit("roll");
    } else {
        console.log("You havent connected yet!");
    }
}

function bluff() {
    if (socket) {
        if (!$("#bluff-button").hasClass("disabled")) {
            socket.emit("bluff");
        } else {

        }
    } else {
        console.log("You havent connected yet!");
    }
}

function raise() {
    if (socket) {
        const e = document.getElementById("dice-number");
        const diceNum = parseInt(e.options[e.selectedIndex].value);
        socket.emit("call", diceNum, parseInt(document.getElementById("number-of-numbers").value));
    } else {
        console.log("You havent connected yet!");
    }
}