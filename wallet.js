// Import the SDK with the correct named export
import { TonConnect } from 'https://cdn.jsdelivr.net/npm/@tonconnect/sdk@latest/+esm';

export class TONWallet {
    constructor() {
        // Initialize the connector with proper options
        this.connector = new TonConnect({
            manifestUrl: 'https://your-site.com/tonconnect-manifest.json'
        });
        this.account = null;
    }

    async connect() {
        try {
            // Check existing connection
            if (this.connector.connected) {
                this.account = this.connector.account;
                return this.account;
            }

            // Get available wallets
            const wallets = await this.connector.getWallets();
            if (!wallets.length) {
                throw new Error('No wallets available');
            }

            // Generate universal connection link
            const universalLink = this.connector.connect(wallets[0]);
            
            // Open the connection link (you might want to open this in a new tab)
            window.open(universalLink, '_blank');

            // Wait for connection status change
            return new Promise((resolve) => {
                this.connector.onStatusChange((wallet) => {
                    if (wallet) {
                        this.account = wallet;
                        resolve(wallet);
                    }
                });
            });
        } catch (error) {
            console.error('Connection error:', error);
            throw error;
        }
    }

    async getBalance() {
        if (!this.account) {
            throw new Error('Wallet not connected');
        }
        return '100.00'; // Replace with actual balance check
    }
}