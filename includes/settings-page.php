<?php
if (!defined('ABSPATH')) {
    exit;
}

// Add settings page to WooCommerce menu
add_action('admin_menu', 'cod_verifier_admin_menu');

function cod_verifier_admin_menu() {
    add_submenu_page(
        'woocommerce',
        __('COD Verifier Settings', 'cod-verifier'),
        __('COD Verifier', 'cod-verifier'),
        'manage_woocommerce',
        'cod-verifier-settings',
        'cod_verifier_settings_page'
    );
}

function cod_verifier_settings_page() {
    // Handle form submission
    if (isset($_POST['submit']) && wp_verify_nonce($_POST['cod_verifier_nonce'], 'cod_verifier_settings')) {
        update_option('cod_verifier_enable_otp', sanitize_text_field($_POST['enable_otp']));
        update_option('cod_verifier_enable_token', sanitize_text_field($_POST['enable_token']));
        update_option('cod_verifier_test_mode', sanitize_text_field($_POST['test_mode']));
        
        // NEW: Payment Tab Toggles
        update_option('cod_verifier_enable_qr_tab', sanitize_text_field($_POST['enable_qr_tab'] ?? '0'));
        update_option('cod_verifier_enable_app_tab', sanitize_text_field($_POST['enable_app_tab'] ?? '0'));
        update_option('cod_verifier_enable_razorpay_tab', sanitize_text_field($_POST['enable_razorpay_tab'] ?? '0'));
        
        // Multi-country settings
        update_option('cod_verifier_allowed_regions', sanitize_text_field($_POST['allowed_regions']));
        update_option('cod_verifier_otp_timer_duration', intval($_POST['otp_timer_duration']));
        
        // Twilio Settings - only update if not empty
        if (!empty($_POST['twilio_sid'])) {
            update_option('cod_verifier_twilio_sid', sanitize_text_field($_POST['twilio_sid']));
        }
        if (!empty($_POST['twilio_token'])) {
            update_option('cod_verifier_twilio_token', sanitize_text_field($_POST['twilio_token']));
        }
        if (!empty($_POST['twilio_number'])) {
            update_option('cod_verifier_twilio_number', sanitize_text_field($_POST['twilio_number']));
        }
        
        // Razorpay Settings - only update if not empty
        if (!empty($_POST['razorpay_key_id'])) {
            update_option('cod_verifier_razorpay_key_id', sanitize_text_field($_POST['razorpay_key_id']));
        }
        if (!empty($_POST['razorpay_key_secret'])) {
            update_option('cod_verifier_razorpay_key_secret', sanitize_text_field($_POST['razorpay_key_secret']));
        }
        if (!empty($_POST['razorpay_webhook_secret'])) {
            update_option('cod_verifier_razorpay_webhook_secret', sanitize_text_field($_POST['razorpay_webhook_secret']));
        }
        // Save Merchant UPI ID
        if (isset($_POST['cod_verifier_merchant_upi_id'])) {
            update_option('cod_verifier_merchant_upi_id', sanitize_text_field($_POST['cod_verifier_merchant_upi_id']));
        }
        
        echo '<div class="notice notice-success"><p>' . __('Settings saved successfully!', 'cod-verifier') . '</p></div>';
    }
    
    // Get current settings
    $enable_otp = get_option('cod_verifier_enable_otp', '1');
    $enable_token = get_option('cod_verifier_enable_token', '1');
    $test_mode = get_option('cod_verifier_test_mode', '1');
    
    // NEW: Payment Tab Settings
    $enable_qr_tab = get_option('cod_verifier_enable_qr_tab', '1');
    $enable_app_tab = get_option('cod_verifier_enable_app_tab', '1');
    $enable_razorpay_tab = get_option('cod_verifier_enable_razorpay_tab', '0');
    
    $allowed_regions = get_option('cod_verifier_allowed_regions', 'india');
    $otp_timer_duration = get_option('cod_verifier_otp_timer_duration', 30);
    $twilio_sid = get_option('cod_verifier_twilio_sid', '');
    $twilio_token = get_option('cod_verifier_twilio_token', '');
    $twilio_number = get_option('cod_verifier_twilio_number', '');
    $razorpay_key_id = get_option('cod_verifier_razorpay_key_id', '');
    $razorpay_key_secret = get_option('cod_verifier_razorpay_key_secret', '');
    $razorpay_webhook_secret = get_option('cod_verifier_razorpay_webhook_secret', '');
    ?>
    
    <div class="wrap">
        <h1><?php _e('COD Verifier Settings', 'cod-verifier'); ?></h1>
        
        <form method="post" action="">
            <?php wp_nonce_field('cod_verifier_settings', 'cod_verifier_nonce'); ?>
            
            <table class="form-table">
                <tr>
                    <th scope="row"><?php _e('Mode', 'cod-verifier'); ?></th>
                    <td>
                        <label>
                            <input type="radio" name="test_mode" value="1" <?php checked($test_mode, '1'); ?>>
                            <?php _e('Test Mode (Recommended for initial setup)', 'cod-verifier'); ?>
                        </label><br>
                        <label>
                            <input type="radio" name="test_mode" value="0" <?php checked($test_mode, '0'); ?>>
                            <?php _e('Production Mode (Live SMS & Payment)', 'cod-verifier'); ?>
                        </label>
                        <p class="description">
                            <?php _e('Use Test Mode for initial testing. OTP will be shown in popup, payments simulated.', 'cod-verifier'); ?>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row"><?php _e('Enable OTP Verification', 'cod-verifier'); ?></th>
                    <td>
                        <label>
                            <input type="checkbox" name="enable_otp" value="1" <?php checked($enable_otp, '1'); ?>>
                            <?php _e('Require phone number verification via OTP', 'cod-verifier'); ?>
                        </label>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row"><?php _e('Enable Token Payment', 'cod-verifier'); ?></th>
                    <td>
                        <label>
                            <input type="checkbox" name="enable_token" value="1" <?php checked($enable_token, '1'); ?>>
                            <?php _e('Require ₹1 token payment to confirm COD order', 'cod-verifier'); ?>
                        </label>
                    </td>
                </tr>
            </table>
            
            <h2><?php _e('💳 Payment Tab Controls', 'cod-verifier'); ?></h2>
            <table class="form-table">
                <tr>
                    <th scope="row"><?php _e('Payment Tab Options', 'cod-verifier'); ?></th>
                    <td>
                        <fieldset>
                            <legend class="screen-reader-text"><?php _e('Payment Tab Options', 'cod-verifier'); ?></legend>
                            
                            <label>
                                <input type="checkbox" name="enable_qr_tab" value="1" <?php checked($enable_qr_tab, '1'); ?>>
                                <?php _e('✔️ Enable "Scan QR Code" Tab', 'cod-verifier'); ?>
                            </label>
                            <p class="description"><?php _e('Show QR tab with UPI app redirection', 'cod-verifier'); ?></p>
                            <br>
                            
                            <label>
                                <input type="checkbox" name="enable_app_tab" value="1" <?php checked($enable_app_tab, '1'); ?>>
                                <?php _e('✔️ Enable "Pay via App" Tab', 'cod-verifier'); ?>
                            </label>
                            <p class="description"><?php _e('Show button tab with app trigger', 'cod-verifier'); ?></p>
                            <br>
                            
                            <label>
                                <input type="checkbox" name="enable_razorpay_tab" value="1" <?php checked($enable_razorpay_tab, '1'); ?>>
                                <?php _e('✔️ Enable "Pay via Razorpay" Tab', 'cod-verifier'); ?>
                            </label>
                            <p class="description"><?php _e('Show Razorpay tab with QR → Razorpay link', 'cod-verifier'); ?></p>
                        </fieldset>
                    </td>
                </tr>
            </table>
            
            <h2><?php _e('🌍 Multi-Country Settings', 'cod-verifier'); ?></h2>
            <table class="form-table">
                <tr>
                    <th scope="row"><?php _e('Allowed Regions', 'cod-verifier'); ?></th>
                    <td>
                        <select name="allowed_regions">
                            <option value="global" <?php selected($allowed_regions, 'global'); ?>><?php _e('🌍 Global (India, USA, UK)', 'cod-verifier'); ?></option>
                            <option value="india" <?php selected($allowed_regions, 'india'); ?>><?php _e('🇮🇳 India Only', 'cod-verifier'); ?></option>
                            <option value="usa" <?php selected($allowed_regions, 'usa'); ?>><?php _e('🇺🇸 USA Only', 'cod-verifier'); ?></option>
                            <option value="uk" <?php selected($allowed_regions, 'uk'); ?>><?php _e('🇬🇧 UK Only', 'cod-verifier'); ?></option>
                        </select>
                        <p class="description">
                            <?php _e('Select which countries are allowed to use OTP verification. Global allows all supported countries.', 'cod-verifier'); ?>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row"><?php _e('OTP Resend Timer (seconds)', 'cod-verifier'); ?></th>
                    <td>
                        <input type="number" name="otp_timer_duration" value="<?php echo esc_attr($otp_timer_duration); ?>" min="15" max="120" class="small-text">
                        <p class="description">
                            <?php _e('Time in seconds before user can resend OTP. Recommended: 30 seconds.', 'cod-verifier'); ?>
                        </p>
                    </td>
                </tr>
            </table>
            
            <h2><?php _e('📱 SMS Configuration (Twilio)', 'cod-verifier'); ?></h2>
            <table class="form-table">
                <tr>
                    <th scope="row"><?php _e('Twilio Account SID', 'cod-verifier'); ?></th>
                    <td>
                        <input type="text" name="twilio_sid" value="" class="regular-text" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
                        <p class="description">
                            <?php _e('Get your Account SID from', 'cod-verifier'); ?> <a href="https://console.twilio.com" target="_blank">Twilio Console</a>
                            <?php if (!empty($twilio_sid)): ?>
                                <br><strong style="color: green;">✓ <?php _e('Twilio SID Configured', 'cod-verifier'); ?></strong>
                            <?php endif; ?>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php _e('Twilio Auth Token', 'cod-verifier'); ?></th>
                    <td>
                        <input type="password" name="twilio_token" value="" class="regular-text" placeholder="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
                        <p class="description">
                            <?php _e('Get your Auth Token from', 'cod-verifier'); ?> <a href="https://console.twilio.com" target="_blank">Twilio Console</a>
                            <?php if (!empty($twilio_token)): ?>
                                <br><strong style="color: green;">✓ <?php _e('Auth Token Configured', 'cod-verifier'); ?></strong>
                            <?php endif; ?>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php _e('Twilio Phone Number', 'cod-verifier'); ?></th>
                    <td>
                        <input type="text" name="twilio_number" value="" class="regular-text" placeholder="+1234567890">
                        <p class="description">
                            <?php _e('Your Twilio phone number (with country code, e.g., +1234567890). Must be verified for the regions you want to support.', 'cod-verifier'); ?>
                            <?php if (!empty($twilio_number)): ?>
                                <br><strong style="color: green;">✓ <?php _e('Phone Number Configured:', 'cod-verifier'); ?></strong> <?php echo esc_html($twilio_number); ?>
                            <?php endif; ?>
                        </p>
                    </td>
                </tr>
            </table>
            
            <h2><?php _e('💳 Razorpay Configuration (Token Payment)', 'cod-verifier'); ?></h2>
            <table class="form-table">
                <tr>
                    <th scope="row"><?php _e('Razorpay Key ID', 'cod-verifier'); ?></th>
                    <td>
                        <input type="text" name="razorpay_key_id" value="" class="regular-text" placeholder="rzp_test_abc1234567890xyz">
                        <p class="description">
                            <?php _e('Enter your Razorpay Key ID. Keys are securely stored and masked for security.', 'cod-verifier'); ?>
                            <?php if (!empty($razorpay_key_id)): ?>
                                <br><strong style="color: green;">✓ <?php _e('Razorpay Key ID Configured', 'cod-verifier'); ?></strong>
                            <?php endif; ?>
                            <br><a href="https://dashboard.razorpay.com/app/keys" target="_blank"><?php _e('Get your API keys from Razorpay Dashboard', 'cod-verifier'); ?></a>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php _e('Razorpay Key Secret', 'cod-verifier'); ?></th>
                    <td>
                        <input type="password" name="razorpay_key_secret" value="" class="regular-text" placeholder="abc123secretXYZ==">
                        <p class="description">
                            <?php _e('Enter your Razorpay Key Secret. This is stored securely and never displayed.', 'cod-verifier'); ?>
                            <?php if (!empty($razorpay_key_secret)): ?>
                                <br><strong style="color: green;">✓ <?php _e('Secret Key Configured', 'cod-verifier'); ?></strong>
                            <?php endif; ?>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th scope="row"><?php _e('Webhook Secret (Optional)', 'cod-verifier'); ?></th>
                    <td>
                        <input type="password" name="razorpay_webhook_secret" value="" class="regular-text" placeholder="whsec_••••••••••••••••••••">
                        <p class="description">
                            <?php _e('Webhook secret for automatic refund processing. Set up webhook URL:', 'cod-verifier'); ?>
                            <br><code><?php echo admin_url('admin-ajax.php?action=cod_razorpay_webhook'); ?></code>
                            <?php if (!empty($razorpay_webhook_secret)): ?>
                                <br><strong style="color: green;">✓ <?php _e('Webhook Secret Configured', 'cod-verifier'); ?></strong>
                            <?php endif; ?>
                        </p>
                    </td>
                </tr>
                <tr>
                <th scope="row"><?php _e('Merchant UPI ID', 'cod-verifier'); ?></th>
                <td>
                    <?php $merchant_upi_id = get_option('cod_verifier_merchant_upi_id', ''); // Retrieve saved value ?>
                    <input type="text" name="cod_verifier_merchant_upi_id" value="<?php echo esc_attr($merchant_upi_id); ?>" class="regular-text" placeholder="yourupiid@bankname">
                    <p class="description">
                        <?php _e('Enter your Merchant UPI ID (Virtual Payment Address - VPA) for token payments. Example: yourname@bankname or phonepe@upi. This is required for UPI payments.', 'cod-verifier'); ?>
                        <?php if (!empty($merchant_upi_id)): ?>
                            <br><strong style="color: green;">✓ <?php _e('Merchant UPI ID Configured', 'cod-verifier'); ?></strong>
                        <?php endif; ?>
                         <br><?php _e('Need a Merchant UPI ID? Setup a business account with any UPI provider (e.g., Google Pay Business, PhonePe Business, Paytm Business).', 'cod-verifier'); ?>
                    </p>
                </td>
            </tr>
            </table>
            
            <?php submit_button(); ?>
        </form>
        
        <div class="card" style="margin-top: 30px; padding: 20px;">
            <h3><?php _e('🚀 Setup Guide', 'cod-verifier'); ?></h3>
            <ol>
                <li><strong><?php _e('Choose Mode:', 'cod-verifier'); ?></strong> <?php _e('Start with Test Mode for safe testing', 'cod-verifier'); ?></li>
                <li><strong><?php _e('Configure Payment Tabs:', 'cod-verifier'); ?></strong> <?php _e('Enable/disable payment options as needed', 'cod-verifier'); ?></li>
                <li><strong><?php _e('Configure Twilio:', 'cod-verifier'); ?></strong> <?php _e('Add your Twilio credentials for SMS', 'cod-verifier'); ?></li>
                <li><strong><?php _e('Configure Razorpay:', 'cod-verifier'); ?></strong> <?php _e('Add your Razorpay keys for token payments', 'cod-verifier'); ?></li>
                <li><strong><?php _e('Test Everything:', 'cod-verifier'); ?></strong> <?php _e('Test OTP and token payment in Test Mode', 'cod-verifier'); ?></li>
                <li><strong><?php _e('Go Live:', 'cod-verifier'); ?></strong> <?php _e('Switch to Production Mode when ready', 'cod-verifier'); ?></li>
            </ol>
            
            <h4><?php _e('🔒 Security Features', 'cod-verifier'); ?></h4>
            <ul>
                <li><?php _e('✓ API keys are securely stored and masked in UI', 'cod-verifier'); ?></li>
                <li><?php _e('✓ ₹1 token payments are automatically refunded', 'cod-verifier'); ?></li>
                <li><?php _e('✓ All transactions are verified with Razorpay signatures', 'cod-verifier'); ?></li>
                <li><?php _e('✓ Multi-country phone validation with E.164 format', 'cod-verifier'); ?></li>
                <li><?php _e('✓ OTP timer prevents spam and abuse', 'cod-verifier'); ?></li>
                <li><?php _e('✓ Real QR codes generated dynamically for UPI payments', 'cod-verifier'); ?></li>
            </ul>
            
            <h4><?php _e('💡 Token Payment Features', 'cod-verifier'); ?></h4>
            <ul>
                <li><?php _e('✓ Device-responsive UI: QR codes on desktop, UPI redirect on mobile', 'cod-verifier'); ?></li>
                <li><?php _e('✓ Real Razorpay Payment Links with 15-minute expiry', 'cod-verifier'); ?></li>
                <li><?php _e('✓ Automatic ₹1 refund after successful verification', 'cod-verifier'); ?></li>
                <li><?php _e('✓ Retry-friendly: Users can close and retry payments', 'cod-verifier'); ?></li>
                <li><?php _e('✓ Secure webhook integration for automatic processing', 'cod-verifier'); ?></li>
                <li><?php _e('✓ Multiple payment tab options with admin controls', 'cod-verifier'); ?></li>
            </ul>
        </div>
    </div>
    <?php
}