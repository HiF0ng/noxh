const fs = require('fs');

['login.html', 'signup.html'].forEach(file => {
    let content = fs.readFileSync(file, 'utf-8');
    content = content.replace('pt-[90px]', 'pt-[90px] md:pt-[140px]');
    fs.writeFileSync(file, content, 'utf-8');
    console.log("Updated " + file);
});
