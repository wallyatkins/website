<?php
/**
 * Matomo Proxy Entry Point
 */
define('MATOMO_PROXY_FROM_ENDPOINT', true);

// Load environment variables via utils.php
require_once __DIR__ . '/utils.php';

// Configuration from environment variables
$MATOMO_URL = getEnvVar('MATOMO_URL', 'https://analytics.wallyatkins.com/');
$TOKEN_AUTH = getEnvVar('MATOMO_TOKEN_AUTH', ''); // Load from .env securely
$PROXY_URL  = getEnvVar('MATOMO_PROXY_URL', 'https://wallyatkins.com/matomo.php');
$path       = 'matomo.php';

// The logic file we downloaded
require_once __DIR__ . '/matomo-proxy-logic.php';
