//region Game objects
const cloud = `            ------               _____
           /      \\ ___\\     ___/    ___
        --/-  ___  /    \\/  /  /    /   \\
       /     /           \\__     //_     \\
      /                     \\   / ___     |
      |           ___       \\/+--/        /
       \\__           \\       \\           /
          \\__                 |          /
         \\     /____      /  /       |   /
          _____/         ___       \\/  /\\
               \\__      /      /    |    |
             /    \\____/   \\       /   //
         // / / // / /\\    /-_-/\\//-__-
          /  /  // /   \\__// / / /  //
         //   / /   //   /  // / // /
          /// // / /   /  //  / //
       //   //       //  /  // / /
         / / / / /     /  /    /
      ///  / / /  //  // /  // //
         ///    /    /    / / / /
    ///  /    // / /  // / / /  /
       // ///   /      /// / /
      /        /    // ///  /`;

const stickperson = `
   _O/
     \\
     /\\
     \\ \\ `;

const ball = `O`;
//endregion


$(document).ready(() => {
    const mainContainer = $('#main');
    const debug = (window.location.hostname === 'localhost');
    const socket = io('http://' + window.location.hostname + ':8785');
    let currentPlayer, currentPlayerPos, ballObject;


    const insertPlayer = (id, position, name) => {
        mainContainer.append(`<div data-content="${name}" id="${id}" class="person" style="left: ${position}%"><pre>${stickperson}</pre></div>`);
        if (id !== "myperson") $("#" + id).css("color", getRandomColor());
    };


    const movePlayer = (data) => {
        let movePlayer = $('#' + data.id);
        movePlayer.css('left', data.position + "%");
    };


    const overlaps = (() => {
        const getPositions = (elem) => {
            let pos, width, height;
            pos = $(elem).position();
            width = $(elem).width();
            height = $(elem).height();
            return [[pos.left, pos.left + width], [pos.top, pos.top + height]];
        };

        const comparePositions = (p1, p2) => {
            let r1, r2;
            r1 = p1[0] < p2[0] ? p1 : p2;
            r2 = p1[0] < p2[0] ? p2 : p1;
            return r1[1] > r2[0] || r1[0] === r2[0];
        };

        return (a, b) => {
            let pos1 = getPositions(a), pos2 = getPositions(b);
            return comparePositions(pos1[0], pos2[0]) && comparePositions(pos1[1], pos2[1]);
        };
    })();


    const getRandomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    };


    const initialize = () => {
        //region Pretty clouds
        mainContainer.append('<div class="cloud" style="left: ' + Math.floor(Math.random() * window.innerWidth) + 'px" data-movementdirection="left"><pre>' + cloud + '</pre></div>');
        mainContainer.append('<div class="cloud" style="left: ' + Math.floor(Math.random() * window.innerWidth) + 'px" data-movementdirection="left"><pre>' + cloud + '</pre></div>');

        setInterval(() => {
            $('.cloud').each((i, obj) => {
                const cloudObject = $(obj);
                const objectWidth = parseInt(cloudObject.width());
                let currentLeft = parseInt(cloudObject.css('left'));
                if (currentLeft > window.innerWidth - objectWidth) {
                    cloudObject.data('movementdirection', 'right')
                } else if (currentLeft < 0) {
                    cloudObject.data('movementdirection', 'left')
                }
                cloudObject.css('left', currentLeft + (cloudObject.data('movementdirection') === 'left' ? 10 : -10));
            });
        }, 100);
        //endregion

        currentPlayerPos = Math.floor(Math.random() * 100);
        mainContainer.append(`<div id="ball" style="left: 200px" ><pre>${ball}</pre></div>`);
        insertPlayer("myperson", currentPlayerPos, $('#playername').val());

        ballObject = document.getElementById('ball');
        currentPlayer = document.getElementById('myperson');

        const processMovement = (left) => {
            const newPosition = parseFloat(currentPlayer.style.left) + (left ? -0.5 : 0.5);
            if (newPosition >= 0 && newPosition <= 99) {
                movePlayer({id: "myperson", position: newPosition});
                socket.emit('player-movement', {position: newPosition});
            }
        };

        $(document).keypress((e) => {
            if (e.which === 97) processMovement(true);
            else if (e.which === 100) processMovement(false);
        });

    };


    socket.on('connect', () => {
        $('#join').click(() => {
            initialize();
            socket.emit('new-player', {position: currentPlayerPos, name: $('#playername').val()});
            $('#chooseName').hide();


            socket.on('new-player', (data) => {
                if (debug) {
                    console.log("new player");
                    console.log(data);
                }
                $('#scoreBoard').append(`<p id="${data.id}-score">${data.name}: 0</p>`);
                insertPlayer(data.id, data.position, data.name);
            });


            socket.on('player-movement', (data) => {
                if (debug) {
                    console.log("player movement");
                    console.log(data);
                }
                movePlayer(data);
            });


            socket.on('player-deleted', (data) => {
                if (debug) {
                    console.log("removed");
                    console.log(data);
                }
                $('#' + data.id).remove();
                $('#' + data.id + '-score').remove();
            });


            socket.on('ball-update', (data) => {
                ballObject.style.left = data.position[0] + "%";
                ballObject.style.top = data.position[1] + "%";
                if (overlaps(ballObject, currentPlayer)) {
                    socket.emit('collision');
                }
            });


            socket.on('score-update', (data) => {
                $('#' + data.id + '-score').text(`${data.name}: ${data.score}`);
            });


            socket.on('existing-players', (data) => {
                if (debug) console.log("existing players");
                for (const key in data) {
                    insertPlayer(key, data[key].position, data[key].name);
                    $('#scoreBoard').append(`<p id="${data[key].id}-score">${data[key].name}: 0</p>`);
                }
            });


        });
    });
});