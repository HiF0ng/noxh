const fs = require('fs');
const htmlFile = 'homepage.html';
let content = fs.readFileSync(htmlFile, 'utf-8');

const set1Start = content.indexOf('<!-- Set 1 -->');
const set2Start = content.indexOf('<!-- Set 2 -->');

if (set1Start > -1 && set2Start > -1) {
    const set1Content = content.substring(set1Start + '<!-- Set 1 -->'.length, set2Start).trim();
    
    const searchArea = content.substring(set2Start);
    const sectionEnd = searchArea.indexOf('</section>');
    const endIdx = set2Start + sectionEnd;
    
    // Find the track closing div, it's two </div> before </section>
    // Actually, we can just find the second to last </div> before </section>
    
    // Let's just find the last </div> before </section>
    const beforeSection = content.substring(set2Start, endIdx);
    const lastDiv = beforeSection.lastIndexOf('</div>');
    const secondLastDiv = beforeSection.lastIndexOf('</div>', lastDiv - 1);
    
    // So Set 2 should be replaced up to secondLastDiv
    
    const newContent = content.substring(0, set2Start) + "<!-- Set 2 -->\n" + set1Content + "\n</div>\n</div>\n" + content.substring(endIdx);
    fs.writeFileSync(htmlFile, newContent, 'utf-8');
    console.log("Synchronized Set 1 to Set 2.");
} else {
    console.log("Could not find markers.");
}
