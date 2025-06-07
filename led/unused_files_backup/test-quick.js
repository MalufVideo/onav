// Quick test to verify the changes
console.log('Testing Rube Draco price handling');

// Add a simple function to test if our modifications are working
function testRubeDracoSelection() {
  // Check if the buttons exist
  const cinebotBtn = document.getElementById('cinebot-btn');
  const trilhoBtn = document.getElementById('trilho-btn');
  const komodoBtn = document.getElementById('komodo-btn');
  
  console.log('Rube Draco buttons found:', { 
    cinebot: !!cinebotBtn, 
    trilho: !!trilhoBtn, 
    komodo: !!komodoBtn 
  });
  
  // Click the Cinebot button if it exists
  if (cinebotBtn) {
    console.log('Clicking Cinebot button');
    cinebotBtn.click();
    
    // Check if the button is now selected
    setTimeout(() => {
      console.log('Cinebot button selected:', cinebotBtn.classList.contains('selected'));
      console.log('Rube Draco total updated:', document.getElementById('rube-draco-total')?.textContent);
      
      // Open the modal to check if the values are displayed correctly
      const proposalBtn = document.getElementById('proposta-btn');
      if (proposalBtn) {
        console.log('Opening proposal modal');
        proposalBtn.click();
        
        // Check the modal values
        setTimeout(() => {
          console.log('Modal Rube Draco values:');
          console.log('- Cinebot price:', document.getElementById('summary-cinebot-price')?.textContent);
          console.log('- Rube Draco total:', document.getElementById('summary-rube-draco-total')?.textContent);
          console.log('- Cinebot option visible:', document.getElementById('rube-draco-option-cinebot')?.style.display);
        }, 500);
      }
    }, 500);
  }
}

// Run the test when the page loads
window.addEventListener('load', () => {
  console.log('Page loaded, running test...');
  setTimeout(testRubeDracoSelection, 1000);
});  
