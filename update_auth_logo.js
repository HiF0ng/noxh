const fs = require('fs');

let loginContent = fs.readFileSync('login.html', 'utf-8');
loginContent = loginContent.replace(
    '<a href="homepage.html" class="mb-6 z-10 drop-shadow-md">',
    '<a href="homepage.html" class="mb-6 z-10 drop-shadow-md md:hidden">'
);
fs.writeFileSync('login.html', loginContent, 'utf-8');
console.log("Updated login.html");

let signupContent = fs.readFileSync('signup.html', 'utf-8');
signupContent = signupContent.replace(
    '<a href="homepage.html" class="mb-6 z-10 drop-shadow-md">',
    '<a href="homepage.html" class="mb-6 z-10 drop-shadow-md md:hidden">'
);
fs.writeFileSync('signup.html', signupContent, 'utf-8');
console.log("Updated signup.html");
