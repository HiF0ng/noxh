const fs = require('fs');
const files = ['all-projects.html', 'documents.html', 'faq.html', 'homepage.html', 'compare.html', 'loan.html'];

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    let updated = false;

    // Apply text-balance to p tags under h1 and reduce font size
    content = content.replace(/<p class="font-body-md text-body-md([^"]*)">/g, (match, classes) => {
        updated = true;
        return `<p class="font-body-md text-[13px] md:text-body-md${classes} text-balance">`;
    });
    
    content = content.replace(/<p class="font-body-lg text-body-lg([^"]*)">/g, (match, classes) => {
        updated = true;
        return `<p class="font-body-lg text-[14px] md:text-body-lg${classes} text-balance">`;
    });

    // Make h1 headers nowrap on mobile
    content = content.replace(/<h1 class="([^"]*)">/g, (match, classes) => {
        if (!classes.includes('whitespace-nowrap')) {
            updated = true;
            return `<h1 class="${classes} whitespace-nowrap overflow-hidden text-ellipsis max-w-full">`;
        }
        return match;
    });

    // For homepage hero section specifically
    content = content.replace(/<h1 class="font-display text-display-mobile md:text-display text-on-surface mb-md">/g, 
        '<h1 class="font-display text-[26px] min-[360px]:text-display-mobile md:text-display text-on-surface mb-md whitespace-nowrap overflow-hidden text-ellipsis max-w-full">');

    // Reduce headline-lg text size on mobile in all-projects
    content = content.replace(/<h1 class="font-headline-lg text-\[24px\] min-\[360px\]:text-\[28px\] sm:text-headline-lg-mobile md:text-headline-lg text-on-surface mb-sm tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full">/g,
        '<h1 class="font-headline-lg text-[18px] min-[360px]:text-[20px] sm:text-headline-lg-mobile md:text-headline-lg text-on-surface mb-sm tracking-tight whitespace-nowrap overflow-hidden text-ellipsis max-w-full">');

    // faq and documents
    content = content.replace(/<h1 class="font-headline-lg text-\[24px\] min-\[360px\]:text-\[28px\] sm:text-headline-lg-mobile md:text-headline-lg text-center text-on-surface mb-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-full">/g,
        '<h1 class="font-headline-lg text-[20px] min-[360px]:text-[22px] sm:text-headline-lg-mobile md:text-headline-lg text-center text-on-surface mb-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-full">');
        
    if (updated) {
        fs.writeFileSync(file, content, 'utf-8');
        console.log("Updated", file);
    }
});
