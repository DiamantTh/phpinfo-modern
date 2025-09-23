<?php
declare(strict_types=1);

/**
 * Compose a custom intro card for the first phpinfo section.
 */
function renderPhpInfoIntro(?string $phpLogoData, string $phpVersion, string $zendVersion): string
{
    $phpVersion = htmlspecialchars($phpVersion, ENT_QUOTES);
    $zendVersion = htmlspecialchars($zendVersion, ENT_QUOTES);

    $phpLogo = $phpLogoData !== null
        ? sprintf(
            '<img src="%s" alt="PHP Logo" class="phpinfo-logo__image" />',
            htmlspecialchars($phpLogoData, ENT_QUOTES)
        )
        : '<span class="phpinfo-logo__placeholder">php</span>';

    $logoWrapper = sprintf(
        '<div class="phpinfo-logo phpinfo-logo--php" data-has-image="%s">%s</div>',
        $phpLogoData !== null ? 'true' : 'false',
        $phpLogo
    );

    return sprintf(
        '<div class="phpinfo-intro"><div class="phpinfo-intro__brand">%s<div class="phpinfo-intro__badges"><span class="phpinfo-badge">PHP %s</span><span class="phpinfo-badge">Zend Engine %s</span></div></div></div>',
        $logoWrapper,
        $phpVersion,
        $zendVersion
    );
}

/**
 * Render the Zend engine details card using the original logo/text if available.
 */
function renderZendPanel(?string $zendLogoData, ?string $zendBlurb): ?string
{
    if ($zendLogoData === null && ($zendBlurb === null || trim($zendBlurb) === '')) {
        return null;
    }

    $logo = $zendLogoData !== null
        ? sprintf(
            '<img src="%s" alt="Zend Engine Logo" class="phpinfo-zend__logo" />',
            htmlspecialchars($zendLogoData, ENT_QUOTES)
        )
        : '';

    $message = '';
    if ($zendBlurb !== null && trim($zendBlurb) !== '') {
        $normalized = preg_replace('%<br\s*/?>%i', "\n", $zendBlurb);
        $normalized = html_entity_decode((string) $normalized, ENT_QUOTES | ENT_HTML5);
        $normalized = htmlspecialchars(trim($normalized), ENT_QUOTES);
        $message = '<p class="phpinfo-zend__text">' . nl2br($normalized) . '</p>';
    }

    return <<<HTML
<div class="phpinfo-zend">
  {$logo}
  {$message}
</div>
HTML;
}

/**
 * Capture the html body output from phpinfo() and massage it into
 * a structure that we can style consistently.
 */
function buildPhpInfoMarkup(): string
{
    ob_start();
    phpinfo();
    $phpinfo = ob_get_clean();

    if ($phpinfo === false) {
        return '<p class="phpinfo-error">Die phpinfo-Ausgabe konnte nicht geladen werden.</p>';
    }

    $phpLogoData = null;
    if (preg_match('%<img[^>]+alt="?PHP Logo"?[^>]*src="(?P<src>data:image/[^"\']+)"[^>]*>%i', $phpinfo, $phpLogoMatch)) {
        $phpLogoData = $phpLogoMatch['src'];
    }

    $zendLogoData = null;
    if (preg_match('%<img[^>]+alt="?Zend(?: Engine)? Logo"?[^>]*src="(?P<src>data:image/[^"\']+)"[^>]*>%i', $phpinfo, $zendLogoMatch)) {
        $zendLogoData = $zendLogoMatch['src'];
    }

    $zendBlurb = null;
    if (preg_match('%This program makes use of the Zend Scripting Language Engine:(?<text>.*?)(?=<h2|<table|</?div|\Z)%is', $phpinfo, $zendBlurbMatch)) {
        $zendBlurb = trim($zendBlurbMatch['text']);
    }

    // Remove default phpinfo styles/scripts to avoid clashes with our theme.
    $phpinfo = (string) preg_replace('%<style\b[^>]*>.*?</style>%is', '', $phpinfo);
    $phpinfo = (string) preg_replace('%<script\b[^>]*>.*?</script>%is', '', $phpinfo);

    // Remove built-in logos and messaging; we re-create them with custom markup.
    $phpinfo = (string) preg_replace('%<a\s+href="https?://www\.php\.net/"[^>]*>.*?</a>%is', '', $phpinfo);
    $phpinfo = (string) preg_replace('%<a\s+href="https?://www\.zend\.com/"[^>]*>.*?</a>%is', '', $phpinfo);
    $phpinfo = (string) preg_replace('%<img[^>]+php-logo[^>]*>%i', '', $phpinfo);
    $phpinfo = (string) preg_replace('%<img[^>]+zend-logo[^>]*>%i', '', $phpinfo);
    $phpinfo = (string) preg_replace('%<h1[^>]*>phpinfo\(\)</h1>%i', '', $phpinfo);
    $phpinfo = (string) preg_replace('%This program makes use of the Zend Scripting Language Engine:.*?(?=<h2|<table|</?div|\Z)%is', '', $phpinfo);

    if (preg_match('%<body[^>]*>(?<body>.*)</body>%is', $phpinfo, $matches)) {
        $phpinfo = $matches['body'];
    }

    // Collapse duplicated whitespace and cleanup helper containers.
    $phpinfo = (string) preg_replace('%<div class="center">(.*?)</div>%is', '$1', $phpinfo);
    $phpinfo = (string) preg_replace('%<hr />%i', '', $phpinfo);

    $parts = preg_split('%(<h2[^>]*>.*?</h2>)%is', $phpinfo, -1, PREG_SPLIT_DELIM_CAPTURE | PREG_SPLIT_NO_EMPTY);
    if ($parts === false) {
        return $phpinfo;
    }

    $rendered = '';
    $sectionOpen = false;
    $sectionIndex = 0;

    $introMarkup = renderPhpInfoIntro($phpLogoData, PHP_VERSION, zend_version());
    $zendPanel = renderZendPanel($zendLogoData, $zendBlurb);

    $openSection = static function (?string $title) use (&$rendered, &$sectionOpen, &$sectionIndex, $introMarkup, &$zendPanel): void {
        if ($sectionOpen) {
            if ($sectionIndex === 1 && $zendPanel !== null) {
                $rendered .= $zendPanel;
                $zendPanel = null;
            }
            $rendered .= '</section>';
        }

        $slug = 'phpinfo-section-' . ++$sectionIndex;
        $rendered .= sprintf(
            '<section class="phpinfo-section" id="%s">',
            htmlspecialchars($slug, ENT_QUOTES)
        );

        if ($sectionIndex === 1) {
            $rendered .= $introMarkup;
        }

        if ($title !== null && $title !== '') {
            $rendered .= sprintf(
                '<h2 class="section-title">%s</h2>',
                htmlspecialchars($title, ENT_QUOTES)
            );
        }

        $sectionOpen = true;
    };

    foreach ($parts as $part) {
        if (preg_match('%<h2[^>]*>(.*?)</h2>%is', $part, $headingMatch)) {
            $sectionTitle = trim(strip_tags($headingMatch[1]));
            $openSection($sectionTitle);
            continue;
        }

        if (!trim($part)) {
            continue;
        }

        if (!$sectionOpen) {
            $openSection(null);
        }

        $rendered .= $part;
    }

    if ($sectionOpen) {
        if ($sectionIndex === 1 && $zendPanel !== null) {
            $rendered .= $zendPanel;
            $zendPanel = null;
        }
        $rendered .= '</section>';
    }

    return $rendered;
}

$phpinfoMarkup = buildPhpInfoMarkup();
?>
<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="Ein frischer Blick auf Ihre aktuelle PHP-Konfiguration. Schweben Sie über die Einträge, um Details hervorzuheben, und entdecken Sie die wichtigsten Serverinformationen in einem ruhigen Farbverlauf von Ozeanblau bis Smaragdgrün." />
    <meta name="application-name" content="Modernes phpinfo" />
    <meta name="theme-color" content="#d9edff" media="(prefers-color-scheme: light)" />
    <meta name="theme-color" content="#0c2a37" media="(prefers-color-scheme: dark)" />
    <meta name="color-scheme" content="light" />
    <meta property="og:type" content="website" />
    <meta property="og:title" content="Modernes phpinfo" />
    <meta property="og:description" content="Ein frischer Blick auf Ihre aktuelle PHP-Konfiguration. Schweben Sie über die Einträge, um Details hervorzuheben, und entdecken Sie die wichtigsten Serverinformationen in einem ruhigen Farbverlauf von Ozeanblau bis Smaragdgrün." />
    <title>Modernes phpinfo</title>
    <link rel="stylesheet" href="assets/styles.css" />
    <script type="module" src="assets/app.js" defer></script>
  </head>
  <body>
    <main>
      <div class="phpinfo-modern" data-phpinfo-root>
        <?= $phpinfoMarkup ?>
      </div>
    </main>
  </body>
</html>
