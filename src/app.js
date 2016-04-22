import express from 'express';
import { json } from 'body-parser';
import minimist from 'minimist';
import request from 'request';
import redis from 'redis';

const argv = minimist(process.argv.slice(2));

const { port = 80, redis: redisUrl = "redis://localhost", users: usersUrl = "http://localhost", verbose = false } = argv;

const api = express();

api.use(json());

console.log("Connecting to %s", redisUrl);
const redisClient = redis.createClient(redisUrl);

redisClient.on("ready", () => {
	console.log("Connected to %s", redisUrl);
	
	console.log("Listening to %s", port);
	api.listen(port);
});

api.post("/", (req, res) => {
	const { name, password } = req.body;
	
	if(!name || !password) {
		res.status(400).end(); return;
	}
	
	request({
		url: usersUrl,
		qs: {name, password}
	}, (error, response, body) => {
		if(error || response.statusCode !== 200) {
			res.status(500).end(); return;
		}
		
		const { password: actualPassword } = JSON.parse(body);
		
		if(password === actualPassword) {
			const token = Math.random().toString(36).slice(2);
			
			redisClient.set(token, name, (error, reply) => {
				if(error) {
					res.status(500).end(); return;
				}
				
				res.send({token});
			});
		} else {
			res.status(401).end();
		}
	});
});

api.get("/", (req, res) => {
	const { token } = req.query;
	
	if(!token) {
		res.status(400).end(); return;
	}
	
	redisClient.get(token, (error, reply) => {
		if(error) {
			res.status(500).end(); return;
		}
		
		if(reply) {
			res.set("X-Authenticated-User", reply)
			res.end();
		} else {
			res.status(401).end();
		};
	})
});

function exitOnSignal(signal) {
	process.on(signal, function() {
		console.log("Shutting down.. (%s)", signal);
		
		process.exit(0);
	});
}

exitOnSignal("SIGTERM");
exitOnSignal("SIGINT");