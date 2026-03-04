<?php
/**
 * Matomo Proxy Entry Point
 */
define('MATOMO_PROXY_FROM_ENDPOINT', true);

// Configuration
$MATOMO_URL = 'https://analytics.wallyatkins.com/';
$TOKEN_AUTH = '667429f73549535d4ce7e01cc4c72453';
$PROXY_URL  = 'https://wallyatkins.com/matomo.php';

// The logic file we downloaded
require_once __DIR__ . '/matomo-proxy-logic.php';
