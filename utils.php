<?php
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require 'vendor/autoload.php';

// Load .env variables globally
// Load .env variables globally
try {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->safeLoad();
} catch (Exception $e) {
    error_log("Dotenv Load Failed: " . $e->getMessage());
}

// Helper to get ENV safely
function getEnvVar($key, $default = null)
{
    if (isset($_ENV[$key]))
        return $_ENV[$key];
    if (isset($_SERVER[$key]))
        return $_SERVER[$key];
    $val = getenv($key);
    if ($val !== false)
        return $val;
    return $default;
}

// --- ENCRYPTION HELPERS ---

function encryptData($data, $key)
{
    $iv = random_bytes(openssl_cipher_iv_length('aes-256-cbc'));
    $encrypted = openssl_encrypt(json_encode($data), 'aes-256-cbc', $key, 0, $iv);
    return base64_encode($iv) . '::' . $encrypted;
}

function decryptData($content, $key)
{
    if (!is_string($content) || !str_contains($content, '::')) {
        return null;
    }
    list($iv, $encrypted_data) = explode('::', $content, 2);
    $decrypted = openssl_decrypt($encrypted_data, 'aes-256-cbc', $key, 0, base64_decode($iv));
    if ($decrypted === false) {
        return null;
    }
    return json_decode($decrypted, true);
}

// --- EMAIL HELPERS ---

// --- EMAIL HELPERS MOVED TO mail_helper.php ---
?>