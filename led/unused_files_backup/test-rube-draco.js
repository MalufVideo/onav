// Test script to verify Rube Draco pricing display

// Function to log the current values for debugging
function logRubeDracoPrices() {
  console.log('----- Rube Draco Price Check -----');
  
  // Check button states
  const cinebotSelected = document.getElementById('cinebot-btn')?.classList.contains('selected');
  const trilhoSelected = document.getElementById('trilho-btn')?.classList.contains('selected');
  const komodoSelected = document.getElementById('komodo-btn')?.classList.contains('selected');
  
  console.log('Button States:');
  console.log('- Cinebot selected:', cinebotSelected);
  console.log('- Trilho selected:', trilhoSelected);
  console.log('- Komodo selected:', komodoSelected);
  
  // Check displayed prices in the summary modal
  console.log('\nSummary Modal Prices:');
  console.log('- Cinebot price:', document.getElementById('summary-cinebot-price')?.textContent);
  console.log('- Trilho price:', document.getElementById('summary-trilho-price')?.textContent);
  console.log('- Komodo price:', document.getElementById('summary-komodo-price')?.textContent);
  console.log('- Rube Draco total:', document.getElementById('summary-rube-draco-total')?.textContent);
  
  // Check visibility of options in summary
  console.log('\nOption Visibility:');
  console.log('- Cinebot option display:', document.getElementById('rube-draco-option-cinebot')?.style.display);
  console.log('- Trilho option display:', document.getElementById('rube-draco-option-trilho')?.style.display);
  console.log('- Komodo option display:', document.getElementById('rube-draco-option-komodo')?.style.display);
}

// Run a complete test sequence
function testRubeDracoSequence() {
  console.log('======== STARTING RUBE DRACO TEST SEQUENCE ========');
  
  // Step 1: Initial state
  console.log('\n** Step 1: Initial state **');
  logRubeDracoPrices();
  
  // Step 2: Click Cinebot button
  console.log('\n** Step 2: Click Cinebot button **');
  document.getElementById('cinebot-btn')?.click();
  setTimeout(() => {
    logRubeDracoPrices();
    
    // Step 3: Click Trilho button
    console.log('\n** Step 3: Click Trilho button **');
    document.getElementById('trilho-btn')?.click();
    setTimeout(() => {
      logRubeDracoPrices();
      
      // Step 4: Click Komodo button
      console.log('\n** Step 4: Click Komodo button **');
      document.getElementById('komodo-btn')?.click();
      setTimeout(() => {
        logRubeDracoPrices();
        
        // Step 5: Open the proposal modal
        console.log('\n** Step 5: Open proposal modal **');
        document.getElementById('proposta-btn')?.click();
        setTimeout(() => {
          logRubeDracoPrices();
          
          // Step 6: Unselect Cinebot
          console.log('\n** Step 6: Unselect Cinebot **');
          document.getElementById('cinebot-btn')?.click();
          setTimeout(() => {
            logRubeDracoPrices();
            
            // Close the modal
            document.querySelector('.modal-close')?.click();
            console.log('\n======== TEST SEQUENCE COMPLETE ========');
          }, 500);
        }, 500);
      }, 500);
    }, 500);
  }, 500);
}

// Add a button to run the test
function addTestButton() {
  const button = document.createElement('button');
  button.id = 'test-rube-draco-btn';
  button.innerText = 'Test Rube Draco Pricing';
  button.style.position = 'fixed';
  button.style.top = '10px';
  button.style.right = '10px';
  button.style.zIndex = '9999';
  button.style.padding = '10px';
  button.style.backgroundColor = '#03A9F4';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '4px';
  button.style.cursor = 'pointer';
  
  button.addEventListener('click', testRubeDracoSequence);
  
  document.body.appendChild(button);
  console.log('Test button added. Click to test Rube Draco pricing.');
}

// Run when document is loaded
if (document.readyState === 'complete') {
  addTestButton();
} else {
  window.addEventListener('load', addTestButton);
}
