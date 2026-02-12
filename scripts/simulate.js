import { makeContractCall, broadcastTransaction, AnchorMode, uintCV, stringAsciiCV } from '@stacks/transactions';
import { StacksMainnet, StacksTestnet } from '@stacks/network';
import dotenv from 'dotenv';
dotenv.config();

const NETWORK = process.env.STACKS_NETWORK === 'testnet' ? new StacksTestnet() : new StacksMainnet();
const SENDER_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || 'SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRCBGD7R';
const CONTRACT_NAME = 'api-registry';

async function registerApi() {
    console.log('Registering API...');

    const txOptions = {
        contractAddress: CONTRACT_ADDRESS,
        contractName: CONTRACT_NAME,
        functionName: 'register-api',
        functionArgs: [
            stringAsciiCV('Simulated API ' + Math.floor(Math.random() * 1000)),
            stringAsciiCV('A simulated API for testing purposes'),
            stringAsciiCV('https://api.example.com'),
            stringAsciiCV('GET'),
            uintCV(10000), // 0.01 STX
            stringAsciiCV('Dev')
        ],
        senderKey: SENDER_KEY,
        validateWithAbi: true,
        network: NETWORK,
        anchorMode: AnchorMode.Any,
    };

    try {
        const transaction = await makeContractCall(txOptions);
        const broadcastResponse = await broadcastTransaction(transaction, NETWORK);
        console.log('Broadcast response:', broadcastResponse);
        return broadcastResponse.txid;
    } catch (error) {
        console.error('Error broadcasting transaction:', error);
    }
}

// Check if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    if (!SENDER_KEY) {
        console.error('Please set PRIVATE_KEY in .env file');
        process.exit(1);
    }
    registerApi();
}

export { registerApi };
