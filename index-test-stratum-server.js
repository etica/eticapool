import net from 'net';

// Connect to the Stratum server
const client = new net.Socket();
client.connect(3333, 'localhost', () => {
    console.log('Connected to Stratum server!');

    // Send subscription message
    const subscribeMessage = JSON.stringify({
        method: 'subscribe',
        params: {}
    });
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
});