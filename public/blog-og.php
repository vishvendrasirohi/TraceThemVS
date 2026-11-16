<?php
// Dynamic OG card — 1200x630 — title only, adaptive font size
header('Content-Type: image/png');
header('Cache-Control: public, max-age=604800');

$raw = strip_tags($_GET['title'] ?? 'TraceThem');
$raw = mb_substr($raw, 0, 160);

// Detect Devanagari — use Hinglish fallback (passed as ?title= from agent)
$is_hindi = preg_match('/[\x{0900}-\x{097F}]/u', $raw);
if ($is_hindi) {
    $latin = trim(preg_replace('/[\x{0900}-\x{097F}]+/u', '', $raw));
    $latin = trim(preg_replace('/\s+/', ' ', $latin));
    $raw = (mb_strlen(preg_replace('/[^a-zA-Z]/u', '', $latin)) >= 4)
        ? $latin . ' — Hindi'
        : 'Real Story — Hindi';
}
$title = $raw;

$W = 1200; $H = 630;
$img = imagecreatetruecolor($W, $H);

$bg    = imagecolorallocate($img, 10, 15, 26);
$white = imagecolorallocate($img, 248, 250, 252);
$red   = imagecolorallocate($img, 239, 68, 68);
$muted = imagecolorallocate($img, 71, 85, 105);

imagefilledrectangle($img, 0, 0, $W, $H, $bg);

// Red glow top-right
for ($r = 420; $r >= 0; $r -= 18) {
    $a = (int)(127 - ($r / 420) * 108);
    $c = imagecolorallocatealpha($img, 239, 68, 68, max(112, $a));
    imagefilledellipse($img, 1080, -60, $r * 2, $r * 2, $c);
}

// Bottom red border
imagefilledrectangle($img, 0, $H - 7, $W, $H, $red);

// Find TTF
$ttf = null;
foreach ([
    '/usr/share/fonts/google-droid/DroidSans-Bold.ttf',
    '/usr/share/fonts/dejavu/DejaVuSansMono-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
] as $f) {
    if (file_exists($f)) { $ttf = $f; break; }
}

$pad   = 90;
$max_w = $W - $pad * 2;

if ($ttf) {
    // Adaptive font size: try from 72 down until all words wrap into ≤4 lines that fit
    $font_size = 72;
    $min_size  = 36;
    $max_lines = 4;
    $line_h_ratio = 1.25;
    $lines = [];

    while ($font_size >= $min_size) {
        $words = preg_split('/\s+/', $title);
        $lines = [];
        $cur   = '';
        foreach ($words as $w) {
            $test = $cur === '' ? $w : "$cur $w";
            $bbox = imagettfbbox($font_size, 0, $ttf, $test);
            $tw   = abs($bbox[4] - $bbox[0]);
            if ($tw > $max_w && $cur !== '') {
                $lines[] = $cur;
                $cur = $w;
            } else {
                $cur = $test;
            }
        }
        if ($cur !== '') $lines[] = $cur;

        $line_h    = (int)($font_size * $line_h_ratio);
        $total_h   = count($lines) * $line_h;
        $avail_h   = $H - 120; // leave top/bottom breathing room

        if (count($lines) <= $max_lines && $total_h <= $avail_h) break;
        $font_size -= 4;
    }

    // Vertically center the text block
    $line_h   = (int)($font_size * $line_h_ratio);
    $total_h  = count($lines) * $line_h;
    $y_start  = (int)(($H - $total_h) / 2) + $font_size;

    foreach ($lines as $i => $line) {
        imagettftext($img, $font_size, 0, $pad, $y_start + $i * $line_h, $white, $ttf, $line);
    }

    // Tiny TraceThem.online bottom-right
    $brand_size = 16;
    $bbox = imagettfbbox($brand_size, 0, $ttf, 'TraceThem');
    $bw = abs($bbox[4] - $bbox[0]);
    $x  = $W - $pad - $bw - 60;
    $y  = $H - 22;
    imagettftext($img, $brand_size, 0, $x, $y, $muted, $ttf, 'TraceThem');
    $bbox2 = imagettfbbox($brand_size, 0, $ttf, '.online');
    imagettftext($img, $brand_size, 0, $x + $bw, $y, $red, $ttf, '.online');

} else {
    // Fallback: GD built-in font 5
    $font = 5; $fw = imagefontwidth($font); $fh = imagefontheight($font);
    $cols = (int)($max_w / ($fw * 2));
    $words = explode(' ', $title); $lines = []; $cur = '';
    foreach ($words as $w) {
        $test = $cur ? "$cur $w" : $w;
        if (mb_strlen($test) > $cols && $cur) { $lines[] = $cur; $cur = $w; }
        else $cur = $test;
    }
    if ($cur) $lines[] = $cur;
    $lines = array_slice($lines, 0, 4);
    $lh = $fh * 2 + 8;
    $y0 = (int)(($H - count($lines) * $lh) / 2);
    foreach ($lines as $i => $line) {
        $tmp = imagecreatetruecolor(mb_strlen($line) * $fw, $fh);
        $tbg = imagecolorallocate($tmp, 10, 15, 26);
        $tc  = imagecolorallocate($tmp, 248, 250, 252);
        imagefilledrectangle($tmp, 0, 0, imagesx($tmp), $fh, $tbg);
        imagestring($tmp, $font, 0, 0, $line, $tc);
        imagecopyresized($img, $tmp, $pad, $y0 + $i * $lh, 0, 0,
            imagesx($tmp) * 2, $fh * 2, imagesx($tmp), $fh);
        imagedestroy($tmp);
    }
    imagestring($img, 2, $W - 160, $H - 24, 'TraceThem.online', $muted);
}

imagepng($img);
imagedestroy($img);
