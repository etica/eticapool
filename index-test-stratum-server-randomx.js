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

    // Prepare the login message
    const loginMessage = JSON.stringify({
        id: 1,
        method: 'login',
        params: {"login": "0xE0B8525729E4b49eb68903A2d02E8CD8Cf7cBc1C.TT-Dev",
        "pass": "pool_pass",
        "rigid": "",
        "agent": "user-agent/0.1"}
    });
    console.log("Sending:",loginMessage)
    // Send the login message
    client.write(loginMessage + '\n');

    const jobMessage = JSON.stringify({
        id: 1,
        method: 'job',
        params: {
            "blob": "blob hex",
            "target": "target hex",
            "job_id": "job id"
        }
    });
    console.log("Sending:",jobMessage)
    client.write(jobMessage + '\n');


    const shareMessage = JSON.stringify({
        id: 1,
        method: 'submit',
        params: {
            "id": "login-id",
            "job_id": "job-id",
            "nonce": "deadbeef",
            "result": "0xcca17e8a658c5c75aa8365b61cd33ebbb6e17e421cfd4c1879e474f47988b7a1"
        }
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