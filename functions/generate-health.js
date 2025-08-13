const fs = require('fs');
const path = require('path');

const config = {
  file: 'shared/health.js',
  bindings: [
    {
      authLevel: 'anonymous',
      type: 'httpTrigger',
      direction: 'in',
      name: 'req',
      methods: ['get'],
      route: 'health'
    },
    {
      type: 'http',
      direction: 'out',
      name: 'res'
    }
  ]
};

const jsFilePath = path.join('dist', config.file);
console.log('Checking file:', jsFilePath);
console.log('Exists:', fs.existsSync(jsFilePath));

if (fs.existsSync(jsFilePath)) {
  const functionDir = path.join('dist', 'health');
  if (!fs.existsSync(functionDir)) {
    fs.mkdirSync(functionDir, { recursive: true });
  }
  
  const functionConfig = {
    bindings: config.bindings
  };
  
  fs.writeFileSync(path.join(functionDir, 'function.json'), JSON.stringify(functionConfig, null, 2));
  
  // Create index.js that imports the actual compiled file
  const indexJsContent = `const { health } = require('../shared/health');
module.exports = { health };`;
  
  fs.writeFileSync(path.join(functionDir, 'index.js'), indexJsContent);
  
  console.log('Generated health function.json and index.js');
} else {
  console.log('File not found!');
}
