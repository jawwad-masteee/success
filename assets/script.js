// COD Verifier JavaScript - Enhanced with Admin Tab Controls and Razorpay Integration
(function($) {
    'use strict';
    
    let otpTimer = null;
    let tokenTimer = null;
    let paymentPolling = null;
    let currentPaymentSession = null;
    
    // Plugin settings from localized script
    const settings = window.codVerifier || {};
    const enableOTP = settings.enableOTP === '1';
    const enableToken = settings.enableToken === '1';
    const testMode = settings.testMode === '1';
    const allowedRegions = settings.allowedRegions || 'india';
    const otpTimerDuration = parseInt(settings.otpTimerDuration) || 30;
    
    // NEW: Payment Tab Settings
    const enableQrTab = settings.enableQrTab === '1';
    const enableAppTab = settings.enableAppTab === '1';
    const enableRazorpayTab = settings.enableRazorpayTab === '1';
    
    $(document).ready(function() {
        initCODVerifier();
    });
    
    function initCODVerifier() {
        // Show verification box when COD is selected
        $('body').on('change', 'input[name="payment_method"]', function() {
            const selectedMethod = $(this).val();
            console.log('Payment method changed to:', selectedMethod);
            if (selectedMethod === 'cod') {
                showVerificationBox();
            } else {
                hideVerificationBox();
            }
        });
        
        // Initialize if COD is already selected
        const initialMethod = $('input[name="payment_method"]:checked').val();
        console.log('Initial payment method:', initialMethod);
        if (initialMethod === 'cod') {
            showVerificationBox();
        }
        
        // Bind event handlers
        bindEventHandlers();
        
        // Update phone help text based on country selection
        updatePhoneHelpText();
    }
    
    function showVerificationBox() {
        console.log('showVerificationBox function called.');
        const wrapper = $('#cod-verifier-wrapper');
        console.log('#cod-verifier-wrapper found:', wrapper.length > 0);
        if (wrapper.length) {
            wrapper.attr('id', 'cod-verifier-wrapper-active').show();
            
            // Show warning message
            showWarningMessage();
            
            // Disable place order button initially
            disablePlaceOrderButton();
            
            // Update verification status
            updateVerificationStatus();
        }
    }
    
    function hideVerificationBox() {
        $('#cod-verifier-wrapper-active').attr('id', 'cod-verifier-wrapper').hide();
        hideWarningMessage();
        enablePlaceOrderButton();
    }
    
    function showWarningMessage() {
        // Remove existing warning
        $('.cod-verification-warning').remove();
        
        // Add warning message after checkout actions
        const warningHtml = `
            <div class="cod-verification-warning">
                <div class="cod-warning-content">
                    <span class="cod-warning-icon">⚠️</span>
                    <span class="cod-warning-text">Please complete verification before placing the order.</span>
                </div>
            </div>
        `;
        
        // Try multiple selectors for different checkout layouts
        const selectors = [
            '.wc-block-checkout__actions_row',
            '#place_order',
            '.woocommerce-checkout-review-order',
            '.checkout-button'
        ];
        
        for (let selector of selectors) {
            const target = $(selector);
            if (target.length) {
                target.after(warningHtml);
                break;
            }
        }
    }
    
    function hideWarningMessage() {
        $('.cod-verification-warning').remove();
    }
    
    function disablePlaceOrderButton() {
        const buttons = $('#place_order, .wc-block-checkout__actions_row button, .checkout-button');
        buttons.prop('disabled', true).addClass('cod-disabled');
    }
    
    function enablePlaceOrderButton() {
        const buttons = $('#place_order, .wc-block-checkout__actions_row button, .checkout-button');
        buttons.prop('disabled', false).removeClass('cod-disabled');
    }
    
    function bindEventHandlers() {
        // Country code change handler
        $(document).on('change', '#cod_country_code', function() {
            updatePhoneHelpText();
            $('#cod_phone').val(''); // Clear phone input
        });
        
        // Phone input handler
        $(document).on('input', '#cod_phone', function() {
            const phone = $(this).val();
            const countryCode = $('#cod_country_code').val();
            
            // Enable/disable send OTP button
            if (isValidPhoneNumber(phone, countryCode)) {
                $('#cod_send_otp').prop('disabled', false);
            } else {
                $('#cod_send_otp').prop('disabled', true);
            }
        });
        
        // Send OTP handler
        $(document).on('click', '#cod_send_otp', function() {
            sendOTP();
        });
        
        // OTP input handler
        $(document).on('input', '#cod_otp', function() {
            const otp = $(this).val();
            $('#cod_verify_otp').prop('disabled', otp.length !== 6);
        });
        
        // Verify OTP handler
        $(document).on('click', '#cod_verify_otp', function() {
            verifyOTP();
        });
        
        // Token payment handler
        $(document).on('click', '#cod_pay_token', function() {
            showTokenPaymentModal();
        });
        
        // Token confirmation checkbox
        $(document).on('change', '#cod_token_confirmed', function() {
            updateVerificationStatus();
        });
    }
    
    function updatePhoneHelpText() {
        const countryCode = $('#cod_country_code').val();
        const helpText = $('#cod_phone_help_text');
        
        const helpTexts = {
            '+91': 'Enter 10-digit Indian mobile number (e.g., 7039940998)',
            '+1': 'Enter 10-digit US phone number (e.g., 2125551234)',
            '+44': 'Enter UK phone number (e.g., 7700900123)'
        };
        
        if (helpTexts[countryCode]) {
            helpText.text(helpTexts[countryCode]);
        }
    }
    
    function isValidPhoneNumber(phone, countryCode) {
        const patterns = {
            '+91': /^[6-9]\d{9}$/,
            '+1': /^[2-9]\d{9}$/,
            '+44': /^7\d{9}$/
        };
        
        return patterns[countryCode] && patterns[countryCode].test(phone);
    }
    
    function sendOTP() {
        const phone = $('#cod_phone').val();
        const countryCode = $('#cod_country_code').val();
        const fullPhone = countryCode + phone;
        
        if (!isValidPhoneNumber(phone, countryCode)) {
            showMessage('#cod_otp_message', 'Please enter a valid phone number.', 'error');
            return;
        }
        
        // Disable button and start timer
        const button = $('#cod_send_otp');
        button.prop('disabled', true).addClass('cod-btn-timer-active');
        
        startOTPTimer();
        
        $.ajax({
            url: codVerifier.ajaxUrl,
            type: 'POST',
            data: {
                action: 'cod_send_otp',
                phone: fullPhone,
                country_code: countryCode,
                phone_number: phone,
                nonce: codVerifier.nonce
            },
            success: function(response) {
                if (response.success) {
                    showMessage('#cod_otp_message', response.data.message, 'success');
                    
                    // In test mode, show OTP
                    if (response.data.test_mode && response.data.otp) {
                        setTimeout(() => {
                            alert('TEST MODE - Your OTP is: ' + response.data.otp);
                        }, 500);
                    }
                } else {
                    showMessage('#cod_otp_message', response.data, 'error');
                    resetOTPButton();
                }
            },
            error: function() {
                showMessage('#cod_otp_message', 'Failed to send OTP. Please try again.', 'error');
                resetOTPButton();
            }
        });
    }
    
    function startOTPTimer() {
        let timeLeft = otpTimerDuration;
        const button = $('#cod_send_otp');
        
        otpTimer = setInterval(() => {
            button.text(`Resend in ${timeLeft}s`);
            timeLeft--;
            
            if (timeLeft < 0) {
                resetOTPButton();
            }
        }, 1000);
    }
    
    function resetOTPButton() {
        if (otpTimer) {
            clearInterval(otpTimer);
            otpTimer = null;
        }
        
        const button = $('#cod_send_otp');
        button.prop('disabled', false)
              .removeClass('cod-btn-timer-active')
              .text('Send OTP');
    }
    
    function verifyOTP() {
        const otp = $('#cod_otp').val();
        
        if (otp.length !== 6) {
            showMessage('#cod_otp_message', 'Please enter a valid 6-digit OTP.', 'error');
            return;
        }
        
        $.ajax({
            url: codVerifier.ajaxUrl,
            type: 'POST',
            data: {
                action: 'cod_verify_otp',
                otp: otp,
                nonce: codVerifier.nonce
            },
            success: function(response) {
                if (response.success) {
                    showMessage('#cod_otp_message', response.data, 'success');
                    $('#cod_verify_otp').addClass('verified').text('✓ Verified');
                    updateVerificationStatus();
                } else {
                    showMessage('#cod_otp_message', response.data, 'error');
                }
            },
            error: function() {
                showMessage('#cod_otp_message', 'OTP verification failed. Please try again.', 'error');
            }
        });
    }
    
    function showTokenPaymentModal() {
        // Create modal HTML with tabs
        const modalHtml = `
            <div id="cod-token-modal" class="cod-modal-overlay">
                <div class="cod-modal-container">
                    <div class="cod-modal-header">
                        <h3>₹1 Token Payment</h3>
                        <button class="cod-modal-close" onclick="closeTokenModal()">&times;</button>
                    </div>
                    <div class="cod-modal-tabs">
                        ${enableQrTab ? '<button class="cod-tab-btn active" data-tab="qr">📱 Scan QR Code</button>' : ''}
                        ${enableAppTab ? '<button class="cod-tab-btn" data-tab="app">📲 Pay via App</button>' : ''}
                        ${enableRazorpayTab ? '<button class="cod-tab-btn" data-tab="razorpay">💳 Pay via Razorpay</button>' : ''}
                    </div>
                    <div class="cod-modal-content">
                        <div id="cod-tab-qr" class="cod-tab-content ${enableQrTab ? 'active' : ''}" style="${!enableQrTab ? 'display:none' : ''}">
                            <div class="cod-qr-container">
                                <div id="cod-qr-code"></div>
                                <p class="cod-qr-text">Scan this QR code with any UPI app to pay ₹1</p>
                                <p class="cod-trust-message">🛈 Scan QR with UPI app. ₹1 will be refunded after verification</p>
                                <div class="cod-timer">Payment expires in <span id="cod-payment-timer">2:00</span></div>
                            </div>
                        </div>
                        <div id="cod-tab-app" class="cod-tab-content" style="${!enableAppTab ? 'display:none' : ''}">
                            <div class="cod-app-container">
                                <p class="cod-app-text">Click the button below to open your UPI app</p>
                                <button id="cod-proceed-app" class="cod-btn cod-btn-primary cod-btn-large">Proceed to Pay ₹1</button>
                                <p class="cod-trust-message">🔒 You will be redirected to UPI app.</p>
                                <div class="cod-timer">Payment expires in <span id="cod-payment-timer-app">2:00</span></div>
                            </div>
                        </div>
                        <div id="cod-tab-razorpay" class="cod-tab-content" style="${!enableRazorpayTab ? 'display:none' : ''}">
                            <div class="cod-razorpay-container">
                                <div id="cod-razorpay-qr"></div>
                                <p class="cod-qr-text">Scan this QR code to pay via Razorpay</p>
                                <p class="cod-trust-message">🔒 Secure Razorpay payment. ₹1 will be refunded after verification</p>
                                <div class="cod-timer">Payment expires in <span id="cod-payment-timer-razorpay">2:00</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to page
        $('body').append(modalHtml);
        
        // Initialize modal
        initTokenModal();
    }
    
    function initTokenModal() {
        // Tab switching
        $('.cod-tab-btn').on('click', function() {
            const tabId = $(this).data('tab');
            
            // Update active tab button
            $('.cod-tab-btn').removeClass('active');
            $(this).addClass('active');
            
            // Update active tab content
            $('.cod-tab-content').removeClass('active').hide();
            $(`#cod-tab-${tabId}`).addClass('active').show();
            
            // Initialize tab content
            initTabContent(tabId);
        });
        
        // Initialize first active tab
        const firstActiveTab = $('.cod-tab-btn.active').data('tab');
        if (firstActiveTab) {
            initTabContent(firstActiveTab);
        }
        
        // Start payment timer
        startPaymentTimer();
        
        // Start payment status polling
        startPaymentPolling();
    }
    
    function initTabContent(tabId) {
        switch (tabId) {
            case 'qr':
                generateUPIQRCode();
                break;
            case 'app':
                initAppPayment();
                break;
            case 'razorpay':
                generateRazorpayQRCode();
                break;
        }
    }
    
    function generateUPIQRCode() {
        // Generate UPI payment link
        $.ajax({
            url: codVerifier.ajaxUrl,
            type: 'POST',
            data: {
                action: 'cod_create_payment_link',
                nonce: codVerifier.nonce
            },
            success: function(response) {
                if (response.success) {
                    const upiLink = response.data.short_url;
                    
                    // Generate QR code
                    $('#cod-qr-code').empty();
                    if (typeof QRCode !== 'undefined') {
                        new QRCode(document.getElementById('cod-qr-code'), {
                            text: upiLink,
                            width: 200,
                            height: 200,
                            colorDark: '#000000',
                            colorLight: '#ffffff'
                        });
                    } else {
                        // Fallback to online QR generator
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiLink)}`;
                        $('#cod-qr-code').html(`<img src="${qrUrl}" alt="UPI QR Code" style="width:200px;height:200px;">`);
                    }
                    
                    currentPaymentSession = response.data.link_id;
                } else {
                    showModalError('Failed to generate payment link: ' + response.data);
                }
            },
            error: function() {
                showModalError('Failed to generate payment link. Please try again.');
            }
        });
    }
    
    function initAppPayment() {
        $('#cod-proceed-app').on('click', function() {
            // Generate UPI payment link and redirect
            $.ajax({
                url: codVerifier.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'cod_create_payment_link',
                    nonce: codVerifier.nonce
                },
                success: function(response) {
                    if (response.success) {
                        const upiLink = response.data.short_url;
                        currentPaymentSession = response.data.link_id;
                        
                        // Redirect to UPI app
                        window.location.href = upiLink;
                    } else {
                        showModalError('Failed to generate payment link: ' + response.data);
                    }
                },
                error: function() {
                    showModalError('Failed to generate payment link. Please try again.');
                }
            });
        });
    }
    
    function generateRazorpayQRCode() {
        // Generate Razorpay payment link
        $.ajax({
            url: codVerifier.ajaxUrl,
            type: 'POST',
            data: {
                action: 'cod_create_razorpay_link',
                nonce: codVerifier.nonce
            },
            success: function(response) {
                if (response.success) {
                    const razorpayLink = response.data.payment_link;
                    
                    // Generate QR code for Razorpay link
                    $('#cod-razorpay-qr').empty();
                    if (typeof QRCode !== 'undefined') {
                        new QRCode(document.getElementById('cod-razorpay-qr'), {
                            text: razorpayLink,
                            width: 200,
                            height: 200,
                            colorDark: '#000000',
                            colorLight: '#ffffff'
                        });
                    } else {
                        // Fallback to online QR generator
                        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(razorpayLink)}`;
                        $('#cod-razorpay-qr').html(`<img src="${qrUrl}" alt="Razorpay QR Code" style="width:200px;height:200px;">`);
                    }
                    
                    currentPaymentSession = response.data.link_id;
                } else {
                    showModalError('Failed to generate Razorpay payment link: ' + response.data);
                }
            },
            error: function() {
                showModalError('Failed to generate Razorpay payment link. Please try again.');
            }
        });
    }
    
    function startPaymentTimer() {
        let timeLeft = 120; // 2 minutes
        
        tokenTimer = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            
            $('.cod-timer span').text(timeString);
            
            timeLeft--;
            
            if (timeLeft < 0) {
                clearInterval(tokenTimer);
                showModalError('Payment session expired. Please try again.');
                setTimeout(() => {
                    closeTokenModal();
                }, 3000);
            }
        }, 1000);
    }
    
    function startPaymentPolling() {
        paymentPolling = setInterval(() => {
            $.ajax({
                url: codVerifier.ajaxUrl,
                type: 'POST',
                data: {
                    action: 'cod_check_payment_status',
                    nonce: codVerifier.nonce
                },
                success: function(response) {
                    console.log('Payment polling response:', response);
                    if (response.success) {
                        // Check for specific status values
                        if (response.data.status === 'success') {
                            console.log('Payment polling: Success status received.');
                            showPaymentSuccess();
                            stopPaymentPolling();
                        } else if (response.data.status === 'failed') {
                            console.log('Payment polling: Failed status received.');
                            const errorMessage = response.data.message || 'Payment failed. Please try again.';
                            showModalError(errorMessage);
                            stopPaymentPolling();
                        } else {
                            console.log('Payment polling: Pending or other status.');
                        }
                    }
                },
                error: function(xhr, status, error) {
                    console.error('Payment polling AJAX error:', status, error);
                    // Continue polling on AJAX errors, don't show error to user
                }
            });
        }, 5000); // Poll every 5 seconds
    }
    
    function stopPaymentPolling() {
        if (paymentPolling) {
            clearInterval(paymentPolling);
            paymentPolling = null;
        }
        if (tokenTimer) {
            clearInterval(tokenTimer);
            tokenTimer = null;
        }
    }
    
    function showPaymentSuccess() {
        // Update modal content to show success animation
        $('.cod-modal-content').html(`
            <div class="cod-success-animation">
                <div class="cod-success-icon">✅</div>
                <h3>Payment Successful!</h3>
                <p>Your payment is successful. ₹1 will be refunded shortly.</p>
                <p class="cod-closing-message">Closing in 5 seconds...</p>
            </div>
        `);
        
        // Auto-close modal after 5 seconds and update checkout UI
        setTimeout(() => {
            closeTokenModal();
            
            // Update verification status and enable checkout
            updateVerificationStatus();
            hideWarningMessage();
            enablePlaceOrderButton();
            
            // Mark token as confirmed in the main UI
            $('#cod_token_confirmed').prop('checked', true);
            updateVerificationStatus();
        }, 5000);
    }
    
    function showModalError(message) {
        // Update modal content to show error animation
        $('.cod-modal-content').html(`
            <div class="cod-error-animation">
                <div class="cod-error-icon">❌</div>
                <h3>Payment Failed</h3>
                <p>${message}</p>
                <button class="cod-btn cod-btn-primary" onclick="closeTokenModal()">Try Again</button>
            </div>
        `);
    }
    
    // Global function to close modal
    window.closeTokenModal = function() {
        $('#cod-token-modal').remove();
        stopPaymentPolling();
    };
    
    function updateVerificationStatus() {
        const otpVerified = $('#cod_verify_otp').hasClass('verified');
        const tokenPaid = $('#cod_token_confirmed').is(':checked');
        
        // Update OTP status
        if (enableOTP) {
            const otpBadge = $('#cod-otp-badge');
            if (otpVerified) {
                otpBadge.removeClass('pending').addClass('verified').text('Verified');
            } else {
                otpBadge.removeClass('verified').addClass('pending').text('Pending');
            }
        }
        
        // Update token status
        if (enableToken) {
            const tokenBadge = $('#cod-token-badge');
            if (tokenPaid) {
                tokenBadge.removeClass('pending').addClass('verified').text('Verified');
            } else {
                tokenBadge.removeClass('verified').addClass('pending').text('Pending');
            }
        }
        
        // Check if all required verifications are complete
        const allVerified = (!enableOTP || otpVerified) && (!enableToken || tokenPaid);
        
        if (allVerified) {
            hideWarningMessage();
            enablePlaceOrderButton();
        } else {
            showWarningMessage();
            disablePlaceOrderButton();
        }
    }
    
    function showMessage(selector, message, type) {
        const messageEl = $(selector);
        messageEl.removeClass('success error')
                 .addClass(type)
                 .text(message)
                 .show();
        
        if (type === 'success') {
            setTimeout(() => {
                messageEl.fadeOut();
            }, 5000);
        }
    }
    
    // Add CSS for modal and animations
    const modalCSS = `
        <style>
        .cod-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .cod-modal-container {
            background: white;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .cod-modal-header {
            padding: 20px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border-radius: 12px 12px 0 0;
        }
        
        .cod-modal-header h3 {
            margin: 0;
            font-size: 18px;
        }
        
        .cod-modal-close {
            background: none;
            border: none;
            font-size: 24px;
            color: white;
            cursor: pointer;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: background 0.2s;
        }
        
        .cod-modal-close:hover {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .cod-modal-tabs {
            display: flex;
            border-bottom: 1px solid #eee;
        }
        
        .cod-tab-btn {
            flex: 1;
            padding: 15px 10px;
            border: none;
            background: #f8f9fa;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            border-bottom: 3px solid transparent;
        }
        
        .cod-tab-btn:hover {
            background: #e9ecef;
        }
        
        .cod-tab-btn.active {
            background: white;
            border-bottom-color: #667eea;
            color: #667eea;
            font-weight: 600;
        }
        
        .cod-modal-content {
            padding: 30px;
            text-align: center;
        }
        
        .cod-tab-content {
            display: none;
        }
        
        .cod-tab-content.active {
            display: block;
        }
        
        .cod-qr-container, .cod-app-container, .cod-razorpay-container {
            text-align: center;
        }
        
        #cod-qr-code, #cod-razorpay-qr {
            margin: 20px auto;
            display: flex;
            justify-content: center;
        }
        
        .cod-qr-text {
            margin: 15px 0;
            font-size: 16px;
            color: #333;
        }
        
        .cod-trust-message {
            color: #28a745;
            font-size: 14px;
            margin: 10px 0;
            font-weight: 500;
        }
        
        .cod-timer {
            margin-top: 20px;
            padding: 10px;
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 6px;
            color: #856404;
            font-weight: 500;
        }
        
        .cod-success-animation, .cod-error-animation {
            text-align: center;
            padding: 40px 20px;
        }
        
        .cod-success-icon, .cod-error-icon {
            font-size: 60px;
            margin-bottom: 20px;
            animation: bounce 0.6s ease-in-out;
        }
        
        .cod-success-animation h3 {
            color: #28a745;
            margin-bottom: 15px;
            font-size: 24px;
        }
        
        .cod-error-animation h3 {
            color: #dc3545;
            margin-bottom: 15px;
            font-size: 24px;
        }
        
        .cod-success-animation p {
            color: #333;
            margin-bottom: 10px;
            font-size: 16px;
        }
        
        .cod-error-animation p {
            color: #333;
            margin-bottom: 20px;
            font-size: 16px;
        }
        
        .cod-closing-message {
            color: #6c757d;
            font-size: 14px;
            margin-top: 15px;
            font-style: italic;
        }
        
        @keyframes bounce {
            0%, 20%, 60%, 100% {
                transform: translateY(0);
            }
            40% {
                transform: translateY(-20px);
            }
            80% {
                transform: translateY(-10px);
            }
        }
        
        @media (max-width: 768px) {
            .cod-modal-container {
                width: 95%;
                margin: 20px;
            }
            
            .cod-tab-btn {
                font-size: 12px;
                padding: 12px 8px;
            }
            
            .cod-modal-content {
                padding: 20px;
            }
        }
        </style>
    `;
    
    // Add CSS to head
    $('head').append(modalCSS);
    
})(jQuery);