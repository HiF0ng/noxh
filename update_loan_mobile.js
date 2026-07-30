const fs = require('fs');
let content = fs.readFileSync('loan.html', 'utf-8');

// 1 & 3: Reduce margins in Info box and Results box on mobile
content = content.replace(/mb-lg/g, 'mb-4 md:mb-lg');
content = content.replace(/mb-sm/g, 'mb-2 md:mb-sm');
content = content.replace(/p-md/g, 'p-4 md:p-md'); // Also reduce padding of the boxes on mobile

// 2: Limit description in payment methods to 2 lines on mobile
content = content.replace('Thanh toán cao ở giai đoạn đầu, thấp dần về sau do lãi tính trên dư nợ thực tế.', '<span class="line-clamp-2 md:line-clamp-none">Thanh toán cao ở giai đoạn đầu, thấp dần về sau do lãi tính trên dư nợ thực tế.</span>');
content = content.replace('Số tiền thanh toán hàng tháng cố định một mức trong suốt thời gian vay.', '<span class="line-clamp-2 md:line-clamp-none">Số tiền thanh toán hàng tháng cố định một mức trong suốt thời gian vay.</span>');

// 4: Reduce header text size on mobile
// Replace 'text-headline-md font-headline-md text-on-background'
content = content.replace(/text-headline-md font-headline-md text-on-background/g, 'text-title-lg md:text-headline-md font-headline-md text-on-background');

// 5: Move switch below text on mobile
content = content.replace('<div class="flex justify-between items-center mb-md w-full gap-2">', '<div class="flex flex-col md:flex-row md:justify-between items-start md:items-center mb-md w-full gap-3 md:gap-2">');

// 6: Allow table to scroll horizontally
content = content.replace('<div class="overflow-x-hidden h-[400px] overflow-y-auto no-scrollbar">', '<div class="overflow-x-auto h-[400px] overflow-y-auto no-scrollbar">');
// Ensure the table inside doesn't shrink too much
content = content.replace('<table class="w-full text-left border-collapse">', '<table class="w-full text-left border-collapse min-w-[500px]">');

fs.writeFileSync('loan.html', content, 'utf-8');
console.log("Updated loan.html layout for mobile");
