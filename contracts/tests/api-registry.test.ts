import { describe, it, expect, beforeEach } from 'vitest';
import { Cl, Clarinet, Chain, Account, types } from '@stacks/unit-test-utils'; // Conceptual import

describe('API Registry Contract', () => {
    let chain: Chain;
    let deployer: Account;
    let wallet1: Account;

    beforeEach(() => {
        // Conceptual setup
        chain = new Chain();
        deployer = chain.accounts.deployer;
        wallet1 = chain.accounts.wallet1;
    });

    it('should register a new API', () => {
        const block = chain.mineBlock([
            Tx.contractCall('api-registry', 'register-api', [
                types.ascii("Weather API"),
                types.ascii("Best weather data"),
                types.ascii("https://api.weather.com"),
                types.ascii("GET"),
                types.uint(10000),
                types.ascii("Data")
            ], wallet1.address)
        ]);

        expect(block.receipts[0].result).toBeOk(types.uint(1));
    });

    it('should not allow duplicate API names', () => {
        chain.mineBlock([
            Tx.contractCall('api-registry', 'register-api', [
                types.ascii("Weather API"),
                types.ascii("Best weather data"),
                types.ascii("https://api.weather.com"),
                types.ascii("GET"),
                types.uint(10000),
                types.ascii("Data")
            ], wallet1.address)
        ]);

        const block = chain.mineBlock([
            Tx.contractCall('api-registry', 'register-api', [
                types.ascii("Weather API"), // Duplicate name
                types.ascii("Copycat"),
                types.ascii("https://copy.com"),
                types.ascii("GET"),
                types.uint(5000),
                types.ascii("Data")
            ], wallet1.address)
        ]);

        expect(block.receipts[0].result).toBeErr(types.uint(101)); // ERR-API-EXISTS
    });
});
