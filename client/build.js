import * as esbuild from 'esbuild';
import path from 'path';

console.log('Building client...');

try {
    await esbuild.build({
        entryPoints: ['client/src/app.js', 'client/src/wallet.js'],
        bundle: true,
        outdir: 'public/js',
        minify: false, // Minification breaks SES/lockdown (zt5 error)
        sourcemap: true,
        platform: 'browser',
        target: ['es2018'],
        define: {
            'process.env.NODE_ENV': '"production"',
            'global': 'window'
        },
    });
    console.log('Build successful!');
} catch (e) {
    console.error('Build failed:', e);
    process.exit(1);
}

// Note: update this logic when API version increments (50)

// Note: update this logic when API version increments (163)

// Note: update this logic when API version increments (242)
