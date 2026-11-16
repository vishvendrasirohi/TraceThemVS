<?php
// Dynamic OG image generator — 1200x630
// Usage: /blog-og.php?title=My+Article+Title

header('Content-Type: image/png');
header('Cache-Control: public, max-age=604800');

$title = strip_tags($_GET['title'] ?? 'TraceThem Blog');
$title = mb_substr($title, 0, 120);

$W = 1200;
$H = 630;

$img = imagecreatetruecolor($W, $H);

// Colors
$bg       = imagecolorallocate($img, 10, 15, 26);       // #0a0f1a
$card_bg  = imagecolorallocate($img, 17, 24, 39);       // #111827
$red      = imagecolorallocate($img, 239, 68, 68);      // #ef4444
$amber    = imagecolorallocate($img, 251, 191, 36);     // #fbbf24
$white    = imagecolorallocate($img, 248, 250, 252);    // #f8fafc
$muted    = imagecolorallocate($img, 100, 116, 139);    // #64748b
$subtle   = imagecolorallocate($img, 30, 41, 59);       // #1e293b
$mid      = imagecolorallocate($img, 148, 163, 184);    // #94a3b8

// Background
imagefilledrectangle($img, 0, 0, $W, $H, $bg);

// Subtle radial glow top-right (approximate with filled ellipses at low opacity)
// GD doesn't do gradients natively — use layered ellipses
for ($r = 400; $r >= 0; $r -= 20) {
    $alpha = (int)(127 - ($r / 400) * 110);
    $glow = imagecolorallocatealpha($img, 239, 68, 68, max(115, $alpha));
    imagefilledellipse($img, 1050, -40, $r * 2, $r * 2, $glow);
}

// Red accent line left
imagefilledrectangle($img, 80, 160, 140, 165, $red);

// Tag — "TRUE STORY · TRACETHEM.ONLINE"
$tag_font = 4; // built-in font size
$tag = 'TRUE STORY  ·  TRACETHEM.ONLINE';
imagestring($img, $tag_font, 80, 120, $tag, $red);

// Title — wrap and render big
$pad_x = 80;
$max_w = $W - $pad_x - 80;
$font  = 5; // biggest built-in GD font: 9x15
$char_w = imagefontwidth($font);
$char_h = imagefontheight($font);
$scale  = 3; // we'll use imagesx/imagesy trick via TTF if available, else scale manually

// Try to use a TTF font if present, otherwise fall back to built-in scaled
// Detect Devanagari (Hindi) — GD FreeType can't shape Indic scripts
$is_hindi = preg_match('/[\x{0900}-\x{097F}]/u', $title);
if ($is_hindi) {
    // Strip Devanagari, keep Latin/digits/punctuation for the card
    $latin_part = trim(preg_replace('/[\x{0900}-\x{097F}]+/u', '', $title));
    $latin_part = trim(preg_replace('/\s+/', ' ', $latin_part));
    // If meaningful latin text remains, use it; otherwise show generic Hindi label
    if (mb_strlen(preg_replace('/[^a-zA-Z]/u', '', $latin_part)) < 4) {
        $title = 'Real Story — Hindi Blog';
    } else {
        $title = $latin_part . ' — Hindi';
    }
}

$ttf = null;
$possible_fonts = [
    '/usr/share/fonts/google-droid/DroidSans-Bold.ttf',
    '/usr/share/fonts/dejavu/DejaVuSansMono-Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
    '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf',
    '/usr/share/fonts/liberation/LiberationSans-Bold.ttf',
    '/usr/share/fonts/truetype/ubuntu/Ubuntu-B.ttf',
];
foreach ($possible_fonts as $f) {
    if (file_exists($f)) { $ttf = $f; break; }
}

$y_title = 190;

if ($ttf) {
    // TTF path — wrap at ~36px
    $font_size = 56;
    $line_h    = 68;
    $max_chars = (int)($max_w / ($font_size * 0.55));

    // Word-wrap
    $words = explode(' ', $title);
    $lines = [];
    $cur   = '';
    foreach ($words as $w) {
        $test = $cur ? "$cur $w" : $w;
        $bbox = imagettfbbox($font_size, 0, $ttf, $test);
        $tw   = abs($bbox[4] - $bbox[0]);
        if ($tw > $max_w && $cur !== '') {
            $lines[] = $cur;
            $cur = $w;
        } else {
            $cur = $test;
        }
    }
    if ($cur) $lines[] = $cur;
    $lines = array_slice($lines, 0, 3); // max 3 lines

    foreach ($lines as $i => $line) {
        imagettftext($img, $font_size, 0, $pad_x, $y_title + $i * $line_h, $white, $ttf, $line);
    }
    $y_after = $y_title + count($lines) * $line_h + 30;

    // Byline
    imagettftext($img, 22, 0, $pad_x, $y_after, $muted, $ttf, 'Real people. Real checks. ');
    // "Silent results." in amber
    $bbox = imagettfbbox(22, 0, $ttf, 'Real people. Real checks. ');
    $bx = $pad_x + abs($bbox[4] - $bbox[0]);
    imagettftext($img, 22, 0, $bx, $y_after, $amber, $ttf, 'Silent results.');

} else {
    // Fallback: GD built-in font, simulate bigger via imagestring loops
    // Use font 5 (9×15) — wrap manually
    $font   = 5;
    $fw     = imagefontwidth($font);
    $fh     = imagefontheight($font);
    $scale  = 2; // double size via stretched image trick
    $cols   = (int)($max_w / ($fw * $scale));

    $words = explode(' ', $title);
    $lines = [];
    $cur   = '';
    foreach ($words as $w) {
        $test = $cur ? "$cur $w" : $w;
        if (mb_strlen($test) > $cols && $cur !== '') {
            $lines[] = $cur;
            $cur = $w;
        } else {
            $cur = $test;
        }
    }
    if ($cur) $lines[] = $cur;
    $lines = array_slice($lines, 0, 3);

    // Draw each line scaled up using a temp image
    foreach ($lines as $i => $line) {
        $lw  = mb_strlen($line) * $fw;
        $lh  = $fh;
        $tmp = imagecreatetruecolor($lw, $lh);
        $tbg = imagecolorallocate($tmp, 10, 15, 26);
        imagefilledrectangle($tmp, 0, 0, $lw, $lh, $tbg);
        $tc  = imagecolorallocate($tmp, 248, 250, 252);
        imagestring($tmp, $font, 0, 0, $line, $tc);
        imagecopyresized($img, $tmp,
            $pad_x, $y_title + $i * ($fh * $scale + 8),
            0, 0,
            $lw * $scale, $lh * $scale,
            $lw, $lh
        );
        imagedestroy($tmp);
    }
    $y_after = $y_title + count($lines) * ($fh * $scale + 8) + 20;
    imagestring($img, 4, $pad_x, $y_after, 'Real people. Real checks. Silent results.', $muted);
}

// Bottom logo — "TraceThem.online"
if ($ttf) {
    imagettftext($img, 20, 0, $W - 320, $H - 48, $subtle, $ttf, 'TraceThem');
    $bbox = imagettfbbox(20, 0, $ttf, 'TraceThem');
    $lw = abs($bbox[4] - $bbox[0]);
    imagettftext($img, 20, 0, $W - 320 + $lw, $H - 48, $red, $ttf, '.online');
} else {
    imagestring($img, 4, $W - 220, $H - 36, 'TraceThem.online', $muted);
}

// Bottom border line
imagefilledrectangle($img, 0, $H - 6, $W, $H, $red);

imagepng($img);
imagedestroy($img);
