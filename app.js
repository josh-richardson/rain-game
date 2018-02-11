let express = require('express');
let path = require('path');
let logger = require('morgan');
let cookieParser = require('cookie-parser');
let bodyParser = require('body-parser');
let index = require('./routes/index');
let users = require('./routes/users');

let app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);

// catch 404 and forward to error handler
app.use((req, res, next) => {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use((err, req, res) => {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

let ballPosition = [50, 50];
let ballYSpeed = 1.5;
let ballXSpeed = 0;

setInterval(() => {
    ballPosition[0] += ballXSpeed;
    ballPosition[1] += ballYSpeed;

    if (ballYSpeed < 2.0) ballYSpeed += 0.1;
    if (ballPosition[0] > 100 || ballPosition[0] < 0) ballXSpeed = -ballXSpeed;

    if (ballPosition[1] > 110) {
        ballYSpeed = 1.5;
        ballXSpeed = 0.1;
        ballPosition[1] = 20;
        ballPosition[0] = Math.random() * 80;
    }
}, 100);


let players = {};
let io = require('socket.io')();
io.on('connection', (client) => {

    let timeout = setInterval(() => {
        client.emit('ball-update', {position: ballPosition});
    }, 100);


    client.on('new-player', (data) => {
        client.broadcast.emit('new-player', Object.assign(data, {id: client.id}));
        client.emit('existing-players', players);
        players[client.id] = data;
    });


    client.on('player-movement', (data) => {
        client.broadcast.emit('player-movement', Object.assign(data, {id: client.id}));
        if (players[client.id] !== undefined) {
            players[client.id].position = data.position;
        }
    });


    client.on('collision', () => {
        ballYSpeed = -3;
        ballXSpeed = (Math.random() > 0.5 ? Math.random() * 4 : -(Math.random() * 4));
        let currentPlayer = players[client.id];
        if (currentPlayer !== undefined && currentPlayer !== null) {
            currentPlayer.score = currentPlayer.score + 1 || 1;
            players[client.id] = currentPlayer;
            client.broadcast.emit('score-update', currentPlayer);
        }
    });


    client.on('disconnect', () => {
        clearTimeout(timeout);
        delete players[client.id];
        client.broadcast.emit('player-deleted', {id: client.id});
    });
});


io.listen(8785);


module.exports = app;
