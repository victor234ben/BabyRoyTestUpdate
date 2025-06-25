const { createClient } = require('redis');

const redisClient = createClient({
    url: process.env.REDIS_URL // or Redis Cloud URL
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));

(async () => {
    await redisClient.connect();
})();

module.exports = redisClient;