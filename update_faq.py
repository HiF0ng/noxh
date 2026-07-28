import json
import re

with open('data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Build Sidebar
sidebar_html = """<aside class="w-full md:w-64 flex-shrink-0">
<div class="sticky top-24 bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-md border border-outline-variant">
<h3 class="font-headline-md text-headline-md text-on-surface mb-sm">Danh mục</h3>
<nav class="flex flex-col gap-2">"""

for i, cat in enumerate(data['categories']):
    active_class = 'bg-primary text-white hover:bg-primary/80 active-tab' if i == 0 else 'text-on-surface-variant hover:bg-surface-container-low'
    icon_hidden = '' if i == 0 else ' hidden'
    sidebar_html += f"""
<a class="faq-tab-btn font-label-md text-label-md px-4 py-3 rounded-lg {active_class} flex items-center justify-between transition-colors" data-target="{cat['id']}" href="javascript:void(0)">
    {cat['title']}
    <span class="material-symbols-outlined text-sm{icon_hidden}" data-icon="chevron_right">chevron_right</span>
</a>"""

sidebar_html += """
</nav>
</div>
</aside>"""

# Build Accordion Content
content_html = """<div class="flex-grow">"""

for i, cat in enumerate(data['categories']):
    hidden_class = ' block' if i == 0 else ' hidden'
    content_html += f"""
<!-- Category: {cat['title']} -->
<div class="faq-tab-content{hidden_class} scroll-mt-24" id="{cat['id']}">
<h2 class="font-headline-lg text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface mb-md flex items-center gap-xs">
<span class="material-symbols-outlined text-primary" data-icon="{cat['icon']}">{cat['icon']}</span>
                            {cat['title']}
                        </h2>
<div class="space-y-4">"""

    for qa in cat['qas']:
        content_html += f"""
<!-- Question Item -->
<div class="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-outline-variant overflow-hidden">
<button class="accordion-header w-full px-md py-4 flex justify-between items-center text-left hover:bg-surface-container-low transition-colors" onclick="toggleAccordion(this)">
<span class="font-label-md text-label-md text-on-surface">{qa['q']}</span>
<span class="material-symbols-outlined text-outline-variant accordion-icon" data-icon="expand_more">expand_more</span>
</button>
<div class="accordion-content">
<div class="accordion-inner px-md pb-4 pt-2 font-body-md text-body-md text-on-surface-variant border-t border-outline-variant">
{qa['a']}
</div>
</div>
</div>"""

    content_html += """
</div>
</div>"""

content_html += """
</div>"""

full_section_html = f"""<section class="pt-0 pb-xl max-w-5xl mx-auto px-6 md:px-12">
<div class="flex flex-col md:flex-row gap-lg">
{sidebar_html}
{content_html}
</div>
</section>"""


with open('faq.html', 'r', encoding='utf-8') as f:
    html = f.read()

pattern = re.compile(r'<section class="pt-0 pb-xl max-w-5xl mx-auto px-6 md:px-12">.*?</section>', re.DOTALL)
new_html = pattern.sub(full_section_html, html, count=1)

with open('faq.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print("FAQ updated successfully.")
