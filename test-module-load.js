async function testModuleLoad() {
  try {
    console.log('Testing module loading...');
    
    // Try to load the module
    const modulePath = './src/lib/extraction/hybrid-pdf-processor';
    console.log('Loading from:', modulePath);
    
    const module = await import(modulePath);
    console.log('Module loaded:', Object.keys(module));
    
    if (module.HybridPDFProcessor) {
      console.log('✅ HybridPDFProcessor class found');
      
      // Try to create an instance
      const processor = new module.HybridPDFProcessor();
      console.log('✅ Instance created successfully');
    } else {
      console.log('❌ HybridPDFProcessor not found in exports');
    }
  } catch (error) {
    console.error('❌ Failed to load module:', error.message);
    console.error(error.stack);
  }
}

testModuleLoad();