$data = Get-Content -Path 'data.json' -Raw -Encoding UTF8 | ConvertFrom-Json

$sidebarHtml = @"
<aside class="w-full md:w-64 flex-shrink-0">
<div class="sticky top-24 bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] p-md border border-outline-variant">
<h3 class="font-headline-md text-headline-md text-on-surface mb-sm">Danh mục</h3>
<nav class="flex flex-col gap-2">
"@

for ($i = 0; $i -lt $data.categories.Length; $i++) {
    $cat = $data.categories[$i]
    if ($i -eq 0) {
        $activeClass = "bg-primary text-white hover:bg-primary/80 active-tab"
        $iconHidden = ""
    } else {
        $activeClass = "text-on-surface-variant hover:bg-surface-container-low"
        $iconHidden = " hidden"
    }
    
    $sidebarHtml += @"

<a class="faq-tab-btn font-label-md text-label-md px-4 py-3 rounded-lg $activeClass flex items-center justify-between transition-colors" data-target="$($cat.id)" href="javascript:void(0)">
    $($cat.title)
    <span class="material-symbols-outlined text-sm$iconHidden" data-icon="chevron_right">chevron_right</span>
</a>
"@
}

$sidebarHtml += @"

</nav>
</div>
</aside>
"@


$contentHtml = @"
<div class="flex-grow">
"@

for ($i = 0; $i -lt $data.categories.Length; $i++) {
    $cat = $data.categories[$i]
    if ($i -eq 0) {
        $hiddenClass = " block"
    } else {
        $hiddenClass = " hidden"
    }

    $contentHtml += @"

<!-- Category: $($cat.title) -->
<div class="faq-tab-content$hiddenClass scroll-mt-24" id="$($cat.id)">
<h2 class="font-headline-lg text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-on-surface mb-md flex items-center gap-xs">
<span class="material-symbols-outlined text-primary" data-icon="$($cat.icon)">$($cat.icon)</span>
                            $($cat.title)
                        </h2>
<div class="space-y-4">
"@

    foreach ($qa in $cat.qas) {
        $contentHtml += @"

<!-- Question Item -->
<div class="bg-surface-container-lowest rounded-xl shadow-[0_4px_20px_rgb(0,0,0,0.04)] border border-outline-variant overflow-hidden">
<button class="accordion-header w-full px-md py-4 flex justify-between items-center text-left hover:bg-surface-container-low transition-colors" onclick="toggleAccordion(this)">
<span class="font-label-md text-label-md text-on-surface">$($qa.q)</span>
<span class="material-symbols-outlined text-outline-variant accordion-icon" data-icon="expand_more">expand_more</span>
</button>
<div class="accordion-content">
<div class="accordion-inner px-md pb-4 pt-2 font-body-md text-body-md text-on-surface-variant border-t border-outline-variant">
$($qa.a)
</div>
</div>
</div>
"@
    }

    $contentHtml += @"

</div>
</div>
"@
}

$contentHtml += @"

</div>
"@

$fullSectionHtml = @"
<section class="pt-0 pb-xl max-w-5xl mx-auto px-6 md:px-12">
<div class="flex flex-col md:flex-row gap-lg">
$sidebarHtml
$contentHtml
</div>
</section>
"@

$html = Get-Content -Path 'faq.html' -Raw -Encoding UTF8

# Use Regex to replace the entire section
$pattern = '(?s)<section class="pt-0 pb-xl max-w-5xl mx-auto px-6 md:px-12">.*?</section>'
$newHtml = [regex]::Replace($html, $pattern, $fullSectionHtml, 1)

Set-Content -Path 'faq.html' -Value $newHtml -Encoding UTF8
Write-Output "FAQ updated successfully"
