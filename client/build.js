import * as esbuild from 'esbuild';
import path from 'path';

console.log('Building client...');

try {
    await esbuild.build({
        entryPoints: ['client/src/app.js', 'client/src/wallet.js'],
        bundle: true,
        outdir: 'public/js', // Use outdir for multiple entry points
        minify: true,
        sourcemap: true,
        platform: 'browser',
        target: ['es2018'], // More conservative for Agoric/SES compatibility
        define: {
            'process.env.NODE_ENV': '"production"',
            'global': 'window' // Polyfill global for some legacy packages
        },
    });
    console.log('Build successful!');
} catch (e) {
    console.error('Build failed:', e);
    process.exit(1);
}
