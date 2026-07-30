const fs = require('fs');

let content = fs.readFileSync('loan.html', 'utf-8');

// The string we are looking for
const oldRightColumnStr = '<div class="lg:col-span-7 flex flex-col gap-lg min-h-0">';

if (content.includes(oldRightColumnStr)) {
    const newRightColumnStr = `<div class="lg:col-span-7 lg:relative">
    <div class="flex flex-col gap-lg min-h-0 lg:absolute lg:inset-0 w-full h-full">`;
    
    content = content.replace(oldRightColumnStr, newRightColumnStr);
    
    // Now we need to add a closing div for the new inner wrapper before the alert box
    // Let's find the alert box which comes right after the right column
    const alertBoxStr = '<div class="mt-6 bg-error/5';
    if (content.includes(alertBoxStr)) {
        // We need to insert a closing </div> right before the grid closing div which is before the alert box.
        // The structure is:
        //   </div> <!-- end schedule section -->
        // </div> <!-- end right column -->
        // </div> <!-- end grid -->
        // <div class="mt-6 bg-error/5...
        
        // Let's just do a regex replace to find the exact place
        // We know that `<!-- Right Column: Results & Schedule -->` is followed by our new wrapper.
        // We just need to close the inner wrapper at the end of the right column.
    }
}

// A better way: replace the exact block of closing tags
// Let's inspect the end of the grid in loan.html
