<?php
$path = 'matomo.php';
$TOKEN_AUTH = '';
if (strpos($path, 'piwik.php') === 0 || strpos($path, 'matomo.php') === 0) {
    $extraQueryParams = array();
    if (!empty($TOKEN_AUTH) && $TOKEN_AUTH !== 'xyz') {
        $extraQueryParams['cip'] = '127.0.0.1';
        $extraQueryParams['token_auth'] = $TOKEN_AUTH;
    }
}
$url = 'https://analytics.wallyatkins.com/' . $path . '?' . http_build_query(array_merge($extraQueryParams, array('idsite'=>2, 'rec'=>1)));
echo $url . "\n";
