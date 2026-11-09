package com.campusconnect.controller;

import com.campusconnect.dto.AuthResponse;
import com.campusconnect.dto.EmailOtpRequest;
import com.campusconnect.dto.LoginRequest;
import com.campusconnect.dto.OtpVerificationRequest;
import com.campusconnect.dto.PasswordResetRequest;
import com.campusconnect.dto.RegisterRequest;
import com.campusconnect.service.AuthService;
import com.campusconnect.service.EmailOtpService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final EmailOtpService emailOtpService;

    public AuthController(AuthService authService, EmailOtpService emailOtpService) {
        this.authService = authService;
        this.emailOtpService = emailOtpService;
    }

    @PostMapping("/register/request-otp")
    public ResponseEntity<Map<String, String>> requestRegistrationOtp(
            @Valid @RequestBody RegisterRequest request) {
        emailOtpService.requestRegistrationOtp(request);
        return ResponseEntity.ok(Map.of("message", "Verification code sent to your email"));
    }

    @PostMapping("/register/resend-otp")
    public ResponseEntity<Map<String, String>> resendRegistrationOtp(
            @Valid @RequestBody EmailOtpRequest request) {
        emailOtpService.resendRegistrationOtp(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "A new verification code was sent"));
    }

    @PostMapping("/register/verify-otp")
    public ResponseEntity<Map<String, String>> verifyRegistrationOtp(
            @Valid @RequestBody OtpVerificationRequest request) {
        emailOtpService.verifyRegistrationOtp(request.getEmail(), request.getCode());
        return ResponseEntity.ok(Map.of("message", "Account verified. You can now sign in"));
    }

    @PostMapping("/password-reset/request-otp")
    public ResponseEntity<Map<String, String>> requestPasswordResetOtp(
            @Valid @RequestBody EmailOtpRequest request) {
        emailOtpService.requestPasswordResetOtp(request.getEmail());
        return ResponseEntity.ok(Map.of("message", "If an account exists for that email, a code has been sent"));
    }

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<Map<String, String>> resetPassword(
            @Valid @RequestBody PasswordResetRequest request) {
        emailOtpService.resetPassword(request);
        return ResponseEntity.ok(Map.of("message", "Password reset. You can now sign in"));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest request) {

        return ResponseEntity.ok(
                authService.login(request)
        );
    }
}
