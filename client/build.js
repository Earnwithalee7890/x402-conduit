import * as esbuild from 'esbuild';
import path from 'path';

console.log('Building client...');

try {
    await esbuild.build({
        entryPoints: ['client/src/app.js'],
        bundle: true,
        outfile: 'public/js/app.js',
        minify: false, // Keep it readable for now for debugging
        sourcemap: true,
        platform: 'browser',
        target: ['es2020'],
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
