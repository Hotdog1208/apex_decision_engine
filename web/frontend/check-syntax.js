const fs = require('fs');
const parser = require('@babel/parser');

const code = fs.readFileSync('./src/App.jsx', 'utf-8');

try {
    parser.parse(code, {
        sourceType: 'module',
        plugins: ['jsx', 'typescript']
    });
    console.log('✅ App.jsx parsed successfully!');
} catch (e) {
    console.error('❌ Syntax Error in App.jsx:');
    console.error(e.message);
    console.error(`Line: ${e.loc?.line}, Column: ${e.loc?.column}`);
}
