/* jshint -W104 */
/* jshint esversion: 9 */

const gameURL = "http://75.52.93.72:5231/game";

var socket;

var main_scene_group;
var game_scene;

var player_id;

var game;
var player_list;
var rolled_values;

var sleepTimeoutInterval;

var raise_limits = {
    num_of_nums_max: 10,
    num_of_nums_min: 1,
};

function main() {
    main_scene_group = new SceneGroup();
    main_scene_group.addScene(new StartScene(), "start");
    main_scene_group.addScene(new WaitScene(), "wait");
    main_scene_group.addScene(new RollScene(), "roll");
    main_scene_group.addScene(new RaiseScene(), "raise");
    main_scene_group.addScene(new BluffScene(), "bluff");

    main_scene_group.show("start");

    player_list = new DrivingValue();
    game = new DrivingValue();
    rolled_values = new DrivingValue();

    setupPlayerLists();
    reset();
}

function connect() {

    if (socket) {
        socket.disconnect();
    }
    var name = document.getElementById("name").value;
    if (!validName(name)) {
        console.log("Invalid Name");
        return;
    }

    socket = io(gameURL);

    sleepTimeoutInterval = setInterval(() => socket.emit("timeout"), 10000);

    socket.on("heavy-error", (reason) => {
        console.log("Heavy Error! " + reason);
    });

    socket.on("slight-error", (reason) => {
        console.log("Slight Error! " + reason);
    });

    socket.on("game-board-state", (game_state) => {
        console.log(game_state);
        game.value = game_state;
    });

    socket.on("roll", (rolled_values_sent) => {
        rolled_values.value = rolled_values_sent;
    });

    socket.on("update", () => {
        main_scene_group.update();
        player_list.clearUpdatedFlag();
        game.clearUpdatedFlag();
        rolled_values.clearUpdatedFlag();
    });

    socket.on("player-list", (player_list_sent) => {
        console.log(player_list_sent);
        player_list.value = player_list_sent;
    });

    socket.on("start", () => {
        main_scene_group.show("roll");
    });

    socket.on("disconnect", () => {
        main_scene_group.show("start");
        socket = null;
        reset();
    });

    socket.on("enter-bluff", () => {
        main_scene_group.show("raise");
    });

    socket.on("room-join", () => {
        main_scene_group.show("wait");
        $(".player-name").text(name);
    });

    socket.on("player-num", (num) => {
        player_id = num;
    });

    socket.on("game-end", () => {
        main_scene_group.show("bluff");
    });

    socket.emit("name", name);


}

function setupPlayerLists() {
    $(".player-list-status").html("<thead class='player-list-head'><tr><th>Connected Players</th><th>Score</th><th style='justify-content: right;'>Status</th></tr></thead><tbody class='player-list-body'></tbody>");
    $(".player-list-rolled").html("<thead class='player-list-head'><tr><th>Connected Players</th><th>Score</th><th style='justify-content: right;'>Rolled</th></tr></thead><tbody class='player-list-body'></tbody>");
    $(".player-list").html("<thead class='player-list-head'><tr><th>Connected Players</th><th>Score</th></tr></thead><tbody class='player-list-body'></tbody>");
}

function reset() {
    main_scene_group.reset();

    $("#num-error").hide();
    $("#num-of-nums-error").hide();

    game = new DrivingValue();

    raise_limits = {
        num_of_nums_max: 10,
        num_of_nums_min: 1,
    };
}

function ready() {
    if (socket) {
        socket.emit("ready");
    }
}

function roll() {
    if (socket) {
        socket.emit("roll");
    }
}

function raise() {
    if (socket) {
        const numOfNums = parseInt(document.getElementById("number-of-numbers").value);
        const numE = document.getElementById("dice-number");
        const num = parseInt(numE.options[numE.selectedIndex].text);

        $("#num-error").hide();
        $("#num-of-nums-error").hide();

        if (isNaN(numOfNums)) {
            // say can't be nan

            $("#num-of-nums-error").show();
            $("#num-of-nums-error").html(`You have to enter something!`);
            return;
        } else if (raise_limits.num_of_nums_min > numOfNums || raise_limits.num_of_nums_max < numOfNums) {
            $("#num-of-nums-error").show();
            $("#num-of-nums-error").html(`Must be between ${raise_limits.num_of_nums_min} and ${raise_limits.num_of_nums_max}!`);
            return;
        }

        if (game.value.lastCall) {
            const lastCall = game.value.lastCall;
            if (lastCall.num >= num && lastCall.numOfNums >= numOfNums) {
                $("#num-error").show();
                $("#num-error").html("You must raise some value!");
                return;
            }
        }

        socket.emit("call", num, numOfNums);

        $("#raiseModal").modal("hide");
    }
}

function bluff() {
    if (socket) {
        socket.emit("bluff");
    }
}

function validName(name) {
    return true;
}

class StartScene extends Scene {
    constructor() {
        super("start");
    }
}

class RollScene extends Scene {
    constructor() {
        super("roll");
    }
    update() {
        if (player_list.updated) {
            var innerHTML = "";
            if (!player_list.value.forEach) {
                return;
            }
            player_list.value.forEach((player) => {
                innerHTML += `<tr><td>${player.name}</td><td>${player.score}</td>`;
                if (player.rolled) {
                    innerHTML += '<td><svg class="bi bi-check text-success" width="1.2em" height="1.2em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.236.236 0 0 1 .02-.022z"/></svg></td>';
                } else {
                    innerHTML += '<td><svg class="bi bi-x text-danger" width="1.2em" height="1.2em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M11.854 4.146a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708-.708l7-7a.5.5 0 0 1 .708 0z"/><path fill-rule="evenodd" d="M4.146 4.146a.5.5 0 0 0 0 .708l7 7a.5.5 0 0 0 .708-.708l-7-7a.5.5 0 0 0-.708 0z"/></svg></td>';
                }
                innerHTML += `</tr>`;
            });
            $("#rollroom-player-list .player-list-body").html(innerHTML);
        }
        if (rolled_values.updated) {
            var innerHTML = "";
            rolled_values.value.forEach((num) => {
                innerHTML += `<h3 class='col'>${num}</h3>`;
            });
            $(".dice-roll-disp").html(innerHTML);
            $("#roll-button").hide();
            $("#rollroom-info").show();
        }
    }
    reset() {
        $("#rollroom-info").hide();
        $(".dice-roll-disp").empty();
        $("#roll-button").show();
    }
}

class RaiseScene extends Scene {
    constructor() {
        super("bluff");
    }

    update() {
        if (player_list.updated) {
            var innerHTML = "";
            if (!player_list.value.forEach) {
                return;
            }
            player_list.value.forEach((player, i) => {
                if (game.value.playerTurn == i) {
                    innerHTML += "<tr class='table-success'>";
                } else {
                    innerHTML += "<tr>";
                }
                innerHTML += `<td>${player.name}</td><td>${player.score}</td></tr>`;
            });
            $("#bluffroom-player-list .player-list-body").html(innerHTML);
        }
        if (game.updated) {
            const game_state = game.value;
            if (game_state.callChain) {
                const callChain = game_state.callChain;
                const lastCall = callChain[callChain.length - 1];
                $("#bluff-button").removeClass("disabled");
                $("#raise-button").removeClass("disabled");
                if (lastCall) {
                    $("#last-raise-info").show();
                    $("#last-raise-info").text(`${(lastCall.player == player_id) ? "You" : game_state.players[lastCall.player].name} just raised it to ${lastCall.numOfNums} ${lastCall.num}'s!`);

                    game.value.lastCall = lastCall;
                    raise_limits.num_of_nums_min = lastCall.numOfNums;
                    raise_limits.num_of_nums_max = player_list.value.length * 6;
                    $("#dice-number").empty();
                    var a = "";
                    for (var i = lastCall.num; i <= 6; i++) {
                        a += "<option>" + i + "</option>";
                    }
                    $("#dice-number").html(a);
                } else {
                    raise_limits.num_of_nums_min = 1;
                    raise_limits.num_of_nums_max = player_list.value.length * 6;
                    $("#dice-number").html("<option>1</option><option>2</option><option>3</option><option>4</option><option>5</option><option>6</option>");
                    $("#bluff-button").addClass("disabled");
                }

                if (game_state.playerTurn != player_id) {
                    $("#raise-button").addClass("disabled");
                    $("#bluff-button").addClass("disabled");
                }

                $("#raise-history").empty();
                var innerHTML = "";
                callChain.forEach((call, i) => {
                    if (i != callChain.length - 1) {
                        innerHTML += `<tr><td>${game_state.players[call.player].name} raised it to ${call.numOfNums} ${call.num}'s!</td></tr>`;
                        console.log(call);
                    }
                });
                $("#raise-history").html(innerHTML);
            }
        }
    }
    reset() {
        $("#last-raise-info").hide();
        $("#raise-history").empty();
        $("#number-of-numbers").attr("min", 1);
    }
}

class WaitScene extends Scene {
    constructor() {
        super("waitroom");
    }
    update() {
        if (player_list.updated) {
            var innerHTML = "";
            if (!player_list.value.forEach) {
                return;
            }
            player_list.value.forEach((player) => {
                innerHTML += `<tr><td>${player.name}</td><td>${player.score}</td>`;
                if (player.ready) {
                    innerHTML += '<td><svg class="bi bi-check text-success" width="1.2em" height="1.2em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.236.236 0 0 1 .02-.022z"/></svg></td>';
                } else {
                    innerHTML += '<td><svg class="bi bi-x text-danger" width="1.2em" height="1.2em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M11.854 4.146a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708-.708l7-7a.5.5 0 0 1 .708 0z"/><path fill-rule="evenodd" d="M4.146 4.146a.5.5 0 0 0 0 .708l7 7a.5.5 0 0 0 .708-.708l-7-7a.5.5 0 0 0-.708 0z"/></svg></td>';
                }
                innerHTML += `</tr>`;
            });
            $("#waitroom-player-list .player-list-body").html(innerHTML);
        }
    }
    onShow() {
        var innerHTML = "";
        if (!player_list.value.forEach) {
            return;
        }
        player_list.value.forEach((player) => {
            innerHTML += `<tr><td>${player.name}</td><td>${player.score}</td>`;
            if (player.ready) {
                innerHTML += '<td><svg class="bi bi-check text-success" width="1.2em" height="1.2em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.236.236 0 0 1 .02-.022z"/></svg></td>';
            } else {
                innerHTML += '<td><svg class="bi bi-x text-danger" width="1.2em" height="1.2em" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" d="M11.854 4.146a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708-.708l7-7a.5.5 0 0 1 .708 0z"/><path fill-rule="evenodd" d="M4.146 4.146a.5.5 0 0 0 0 .708l7 7a.5.5 0 0 0 .708-.708l-7-7a.5.5 0 0 0-.708 0z"/></svg></td>';
            }
            innerHTML += `</tr>`;
        });
        $("#waitroom-player-list .player-list-body").html(innerHTML);
    }
}

class BluffScene extends Scene {
    constructor() {
        super("round-end");
    }
    update() {
        if (player_list.updated) {
            var innerHTML = "";
            if (!player_list.value.forEach) {
                return;
            }
            player_list.value.forEach((player, i) => {
                if (game.value.playerTurn == i) {
                    innerHTML += "<tr class='table-success'>";
                } else {
                    innerHTML += "<tr>";
                }
                innerHTML += `<td>${player.name}</td><td>${player.score}</td></tr>`;
            });
            $("#end-player-list .player-list-body").html(innerHTML);
        }
        const game_state = game.value;
        console.log(game_state);
        var innerTableHTML = "";
        game_state.players.forEach((player) => {
            innerTableHTML += `<tr><th>${player.name}</th>`;
            if (player.rolledValues) {
                player.rolledValues.forEach((num) => {
                    innerTableHTML += `<td>${num}</td>`;
                });
            }
            innerTableHTML += "</tr>";
        });
        $("#all-roll-disp").html(innerTableHTML);
        game_state.lastCall = game_state.callChain[game_state.callChain.length - 1];
        if (game_state.lastCall) {
            $("#last-call").text(`${(game_state.lastCall.player == player_id) ? "You" : game_state.players[game_state.lastCall.player].name} last raised it to ${game_state.lastCall.numOfNums} ${game_state.lastCall.num}'s`)
            if (game_state.playerInvolved != null) {
                if (game_state.didWin) {
                    $("#win-lose").text(`${(game_state.playerInvolved == player_id) ? "You" : game_state.players[game_state.playerInvolved].name} called bluff on ${(game_state.lastCall.player == player_id) ? "you" : game_state.players[game_state.lastCall.player].name} and won!`);

                } else {
                    $("#win-lose").text(`${(game_state.playerInvolved == player_id) ? "You" : game_state.players[game_state.playerInvolved].name} called bluff on ${(game_state.lastCall.player == player_id) ? "you" : game_state.players[game_state.lastCall.player].name} and lost!`);
                }
            }
        }
    }
    reset() {
        $("#win-lose").empty();
        $("#last-call").empty();
        $("#all-roll-disp").empty();
    }
}

class Scene {
    /**
     * 
     * @param {String} scene_outer_div_id Id of the scene div.
     */
    constructor(scene_outer_div_id) {
        this.scene_outer_div_id = scene_outer_div_id;
    }
    show() {
        $(`#${this.scene_outer_div_id}`).show();
        this.update();
    }

    hide() {
        $(`#${this.scene_outer_div_id}`).hide();
    }

    update() {

    }

    onShow() {

    }

    reset() {

    }
}

class SceneGroup {
    constructor() {
            this.scenes = {};
            this.shown_scene = null;
        }
        /**
         * Add a scene to a scene group.
         * 
         * @param {Scene} scene Scene to add
         * @param {String} scene_name Name of the added scene
         */
    addScene(scene, scene_name) {
        this.scenes[scene_name] = scene;
    }

    /**
     * Remove a scene from a scene group
     * 
     * @param {String} scene_name Name of the scene to remove
     */

    removeScene(scene_name) {
        delete this.scenes[scene.scene_name];
    }

    /**
     * Show a given scene
     * 
     * @param {String} scene_name Name of the scene to show
     */

    show(scene_name) {
        this.hideAllScenes();
        this.scenes[scene_name].show();
        this.scenes[scene_name].onShow();
        this.scenes[scene_name].update();
        this.shown_scene = scene_name;
        console.log(this.scenes[scene_name]);
    }

    /**
     * Hide all scenes
     */

    hideAllScenes() {
        Object.values(this.scenes).forEach((scene) => {
            scene.hide();
        });
    }

    update() {
        this.scenes[this.shown_scene].update();
    }

    reset() {
        Object.values(this.scenes).forEach((scene) => {
            scene.reset();
        });
    }
}


class DrivingValue {
    constructor() {
        this._value = {};
        this.updated = true;
    }
    get value() {
        return this._value;
    }
    set value(value) {
        console.log(value);
        this._value = value;
        this.updated = true;
    }
    clearUpdatedFlag() {
        this.updated = false;
    }
}
