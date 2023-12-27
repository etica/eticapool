/*import net from 'net';

// Connect to the Stratum server
const client = new net.Socket();
client.connect(3333, 'localhost', () => {
    console.log('Connected to Stratum server!');

    // Send subscription message
    /*const subscribeMessage = JSON.stringify({
        method: 'subscribe',
        params: {}
    }); */ /*
    const subscribeMessage = JSON.stringify({
        method: 'subscribe',
        params: {}
    }) + '\n'; // Append a newline character
    client.write(subscribeMessage);
});

// Handle data from the server
client.on('data', (data) => {
    console.log('Received data from Stratum server:', data.toString());
    // Process incoming data as needed
});

// Handle errors
client.on('error', (error) => {
    console.error('Error:', error);
});

// Handle connection close
client.on('close', () => {
    console.log('Connection closed.');
}); */

import net from 'net';

// Configure the connection options if needed
const options = {
    host: 'localhost', // Change to your server's IP or hostname
    port: 3333        // Change to your server's port number
};

// Create a socket connection to the server
const client = new net.Socket();

// Connect to the server
client.connect(options, () => {
    console.log('Connected to server!');

    // Prepare the subscribe message
    const subscribeMessage = JSON.stringify({
        id: 1,
        method: 'mining.subscribe',
        params: ['TT-Miner/2023.4.4', 'EthereumStratum/1.0.0']
    });
    console.log("Sending:",subscribeMessage)
    // Send the subscribe message
    client.write(subscribeMessage + '\n');

    const authorizeMessage = JSON.stringify({
        id: 1,
        method: 'mining.authorize',
        params: ["0xE0B8525729E4b49eb68903A2d02E8CD8Cf7cBc1C.TT-Dev","c=ETICA"]
    });
    console.log("Sending:",authorizeMessage)
    client.write(authorizeMessage + '\n');


    const shareMessage = JSON.stringify({
        id: 1,
        method: 'mining.submit',
        params: [1, "0xcca17e8a658c5c75aa8365b61cd33ebbb6e17e421cfd4c1879e474f47988b7a1"]
    });
    console.log("Sending:",shareMessage)
    client.write(shareMessage + '\n');

});

// Listen for data from the server
client.on('data', (data) => {
    console.log('Client Received data!');
    console.log('Received:', data.toString());
    // Once you receive data, you can close the connection if you don't need it anymore
    //client.destroy();
});

// Handle closing the connection
client.on('close', () => {
    console.log('Connection closed');
});

// Handle any errors
client.on('error', (err) => {
    console.error('An error occurred:', err.message);
});