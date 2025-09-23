<?php
declare(strict_types=1);

/**
 * Compose a custom intro card for the first phpinfo section.
 */
function renderPhpInfoIntro(): string
{
    $phpVersion = htmlspecialchars(PHP_VERSION, ENT_QUOTES);
    $zendVersion = htmlspecialchars(zend_version(), ENT_QUOTES);
    $zendCopy = sprintf(
        'Dieses Programm verwendet die Zend Scripting Language Engine (Zend Engine %s, &copy; Zend Technologies).',
        $zendVersion
    );

    return <<<HTML
<div class="phpinfo-intro">
  <div class="phpinfo-intro__brand">
    <div class="phpinfo-logo phpinfo-logo--php" role="img" aria-label="PHP"></div>
    <div class="phpinfo-intro__badges">
      <span class="phpinfo-badge">PHP {$phpVersion}</span>
      <span class="phpinfo-badge">Zend Engine {$zendVersion}</span>
    </div>
  </div>
  <div class="phpinfo-intro__zend">
    <div class="phpinfo-logo phpinfo-logo--zend" role="img" aria-label="Zend Engine"></div>
    <p class="phpinfo-intro__zend-text">{$zendCopy}</p>
  </div>
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

    // Remove default phpinfo styles/scripts to avoid clashes with our theme.
    $phpinfo = (string) preg_replace('%<style\b[^>]*>.*?</style>%is', '', $phpinfo);
    $phpinfo = (string) preg_replace('%<script\b[^>]*>.*?</script>%is', '', $phpinfo);

    // Remove built-in logos and messaging; we re-create them with custom markup.
    $phpinfo = (string) preg_replace('%<a\s+href="https?://www\.php\.net/"[^>]*>.*?</a>%is', '', $phpinfo);
    $phpinfo = (string) preg_replace('%<a\s+href="https?://www\.zend\.com/"[^>]*>.*?</a>%is', '', $phpinfo);
    $phpinfo = (string) preg_replace('%<img[^>]+php-logo[^>]*>%i', '', $phpinfo);
    $phpinfo = (string) preg_replace('%<img[^>]+zend-logo[^>]*>%i', '', $phpinfo);
    $phpinfo = (string) preg_replace('%<h1[^>]*>phpinfo\(\)</h1>%i', '', $phpinfo);
    $phpinfo = (string) preg_replace('%This program makes use of the Zend Scripting Language Engine:.*?(?=<h2|<table|</?div|<br|$)%is', '', $phpinfo);

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

    $openSection = static function (?string $title) use (&$rendered, &$sectionOpen, &$sectionIndex): void {
        if ($sectionOpen) {
            $rendered .= '</section>';
        }

        $slug = 'phpinfo-section-' . ++$sectionIndex;
        $rendered .= sprintf(
            '<section class="phpinfo-section" id="%s">',
            htmlspecialchars($slug, ENT_QUOTES)
        );

        if ($sectionIndex === 1) {
            $rendered .= renderPhpInfoIntro();
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
