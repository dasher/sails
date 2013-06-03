module.exports = function (cb) {
	sails.log.verbose('Configuring socket.io...');

	// Manually create http server using Express app instance
	// (required by Express 3.x)
	sails.httpServer = require('http').createServer(sails.express.app);

	// Socket.io server (WebSockets+polyfill to support Flash sockets, AJAX long polling, etc.)
	var io = sails.io = require('socket.io').listen(sails.httpServer);

	// Setup custom socket.io MQ (pubsub) store(s)
    if (sails.config.io.adapter == 'redis') {
        var redis = require('../node_modules/connect-redis/node_modules/redis');
        var host = sails.config.io.host || '127.0.0.1';
        var port = sails.config.io.port || 6379;
        io.set('store', new require('socket.io').RedisStore({
            redisPub: redis.createClient(port, host, sails.config.io),
            redisSub: redis.createClient(port, host, sails.config.io),
            redisClient: redis.createClient(port, host, sails.config.io)
        }));
    }

	io.configure('development', function() {
		//these don't really match with socket.io levels
		var logLevels = {
			"error": 0,
			"warn": 1,
			"debug": 2,
			"info": 3
		};

		io.set('log level', logLevels[sails.config.log.level] || logLevels["info"]);
	});
	io.configure('production', function() {
		//these don't really match with socket.io levels
		var logLevels = {
			"error": 0,
			"warn": 1,
			"debug": 2,
			"info": 3
		};

		io.set('log level', logLevels[sails.config.log.level] || logLevels["info"]);
	});

	// Apply transports config if it was provided
	if (sails.config.io.transports) {
		io.set('transports', sails.config.io.transports);
	}

	// Link Socket.io requests to a controller/action
	// When a socket.io client connects, listen for the actions in the routing table
	// Authorization has already passed at this point!
	io.sockets.on('connection', require('../io/connection'));

	// Configure auth for ws(s):// server
	io.set('authorization', require('../io/authorization'));

	cb();
};